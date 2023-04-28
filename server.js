const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
var ipapi = require('ipapi.co');
const fs = require('fs'); const initializePassport = require("./passportConfig");

initializePassport(passport);
require("dotenv").config();

const apiKey = `${process.env.API_KEY}`;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: "secret",

    resave: false,

    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.set("view engine", "ejs");

let lista_orase = fs.readFileSync('city_list.json').toString("utf-8");
lista_orase = JSON.parse(lista_orase);

app.get("/", function (req, res) {
    // It will not fetch and display any data in the index page
    res.render("index", { weather: null, error: null, orase: lista_orase });


});

let orase_favorite_test = ["Bucharest", "Ploiesti", "Buzau", "Mizil", "Suceava"];

class oras_favorit {
    constructor(name, temp, icon) {
        this.name = name;
        this.temp = temp;
        this.icon = icon;
    }
};


app.get("/orase_favorite", function (req, res) {
    let fav_city = [];

    // Use that city name to fetch data
    // Use the API_KEY in the '.env' file
    let promises = [];
    for (let i = 0; i < orase_favorite_test.length; i++) {
        let url = `http://api.openweathermap.org/data/2.5/weather?q=${orase_favorite_test[i]}&units=metric&appid=${apiKey}`;
        // we use promises to ensure that all requests are completed before we render the page
        let promise = new Promise((resolve, reject) => {
            request(url, function (err, response, body) {
                if (err) {
                    reject(err);
                } else {
                    let weather = JSON.parse(body);
                    let oras = new oras_favorit(
                        weather.name,
                        weather.main.temp,
                        `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`
                    );
                    resolve(oras);
                }
            });
        });
        promises.push(promise);
    }

    Promise.all(promises)
        .then((results) => {
            fav_city = results;
            res.render("orase_favorite", { orase_favorite: fav_city });
            console.log(orase_favorite_test);
        })
        .catch((error) => {
            console.log(error);
            res.send("An error occurred.");
        });
});

app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("register");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
    res.render("login");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
    res.render("dashboard", { user: req.user.name });
});

app.get("/users/logout", (req, res) => {
    req.logout(req.user, err => {
        if (err) return next(err);
        req.flash('success_msg', "You have logged out successfully!");
        res.redirect("/");
    });
});

app.post("/users/register", async (req, res) => {
    let { name, email, password, password2 } = req.body;

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields!" });
    }

    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters!" });
    }

    if (password != password2) {
        errors.push({ message: "Passwords do not match!" });
    }

    if (errors.length > 0) {
        res.render("register", { errors });
    } else {
        let encryptedPass = await bcrypt.hash(password, 10);

        pool.query(
            `SELECT * FROM USERS WHERE email=$1`, [email], (err, results) => {
                if (err) {
                    throw err;
                }
                if (results.rows.length > 0) {
                    errors.push({ message: "Email already registered!" });
                    res.render("register", { errors });
                }
                else {
                    pool.query(
                        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, password`, [name, email, encryptedPass], (err, results) => {
                            if (err) {
                                throw err;
                            }
                            req.flash('success_msg', "You have successfully registered. Please login to continue.");
                            res.redirect("/users/login");
                        }
                    )
                }
            }
        )
    }
});

app.post('/', function (req, res) {

    // Get city name passed in the form
    let city = req.body.city;

    // Use that city name to fetch data
    // Use the API_KEY in the '.env' file
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        // On return, check the json data fetched
        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);

            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {
                // we shall use the data got to set up your output
                let place = `${weather.name}, ${weather.sys.country}`,
                    /* you shall calculate the current timezone using the data fetched*/
                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    /* you will fetch the weather icon and its size using the icon data*/
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;

                // you shall also round off the value of the degrees fahrenheit calculated into two decimal places
                function roundToTwo(num) {
                    return +(Math.round(num + "e+2") + "e-2");
                }
                weatherFahrenheit = roundToTwo(weatherFahrenheit);

                res.render("index", {
                    weather: weather,
                    place: place,
                    temp: weatherTemp,
                    pressure: weatherPressure,
                    icon: weatherIcon,
                    description: weatherDescription,
                    timezone: weatherTimezone,
                    humidity: humidity,
                    fahrenheit: weatherFahrenheit,
                    clouds: clouds,
                    visibility: visibility,
                    main: main,
                    error: null,
                    orase: lista_orase
                });
            }
        }
    })
});

app.get("/:oras", function (req, res) {

    let city = req.params.oras;

    // Use that city name to fetch data
    // Use the API_KEY in the '.env' file
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        // On return, check the json data fetched
        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);

            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {
                // we shall use the data got to set up your output
                let place = `${weather.name}, ${weather.sys.country}`,
                    /* you shall calculate the current timezone using the data fetched*/
                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    /* you will fetch the weather icon and its size using the icon data*/
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;

                // you shall also round off the value of the degrees fahrenheit calculated into two decimal places
                function roundToTwo(num) {
                    return +(Math.round(num + "e+2") + "e-2");
                }
                weatherFahrenheit = roundToTwo(weatherFahrenheit);

                res.render("index", {
                    weather: weather,
                    place: place,
                    temp: weatherTemp,
                    pressure: weatherPressure,
                    icon: weatherIcon,
                    description: weatherDescription,
                    timezone: weatherTimezone,
                    humidity: humidity,
                    fahrenheit: weatherFahrenheit,
                    clouds: clouds,
                    visibility: visibility,
                    main: main,
                    error: null,
                    orase: lista_orase
                });
            }
        }
    })
});

var city_auto = '';

var callback = function (res) {
    city_auto = res.city;
};

app.get("/locatie_automata", function (req, res) {

    // let ip = req.ip; daca aplicatia ar fi pe net
    // let ip = '188.24.29.24'; Cluj
    // Bucuresti
    let ip = '45.250.65.105';

    // Get city name passed in the form
    ipapi.location(callback, ip);
    let city = city_auto;
    // Use that city name to fetch data
    // Use the API_KEY in the '.env' file
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        // On return, check the json data fetched
        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);


            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {
                // we shall use the data got to set up your output
                let place = `${weather.name}, ${weather.sys.country}`,
                    /* you shall calculate the current timezone using the data fetched*/
                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    /* you will fetch the weather icon and its size using the icon data*/
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;

                // you shall also round off the value of the degrees fahrenheit calculated into two decimal places
                function roundToTwo(num) {
                    return +(Math.round(num + "e+2") + "e-2");
                }
                weatherFahrenheit = roundToTwo(weatherFahrenheit);

                res.render("index", {
                    weather: weather,
                    place: place,
                    temp: weatherTemp,
                    pressure: weatherPressure,
                    icon: weatherIcon,
                    description: weatherDescription,
                    timezone: weatherTimezone,
                    humidity: humidity,
                    fahrenheit: weatherFahrenheit,
                    clouds: clouds,
                    visibility: visibility,
                    main: main,
                    error: null,
                    orase: lista_orase
                });
            }
        }
    })

});





app.post("/users/login", passport.authenticate('local', {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect("/users/dashboard");
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/users/login");
}

app.listen(5000, function () {
    console.log("Weather app listening on port 5000!");
});