const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const fs = require('fs'); const initializePassport = require("./passportConfig");
const nodemailer = require('nodemailer');
const mailgen = require('mailgen');
const axios = require('axios');
const CronJob = require('cron').CronJob;
const apiKey = `${process.env.API_KEY}`;
const user = `${process.env.USER}`;
const pass = `${process.env.PASS}`;

// const client = 'timiandrei223@gmail.com'

// function get_client_alert_data() {
//     return new Promise((resolve, reject) => {
//         pool.query('select email, oras_default from users WHERE alert = true', (err, result) => {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve({
//                     email: result.rows[0].email,
//                     oras_default: result.rows[0].oras_default
//                 });
//             }
//         });
//     });
// }

const cronJob = new CronJob('0 0 8 * * *', run);
cronJob.start();

// async function test() {
//     try {
//         const client_data = await get_client_alert_data();
//         console.log(client_data);
//         console.log(client_data.oras_default);
//         console.log(client_data.email);
//     } catch (error) {
//         console.log('error', error);
//     }
// }
// test();
// ##########################################################################
async function run() {
    try {

        const weatherData = await getWeatherData('Bucharest');
        await sendm(weatherData.current_weather, client);

    } catch (error) {
        console.log('error', error);
    }
}

function getWeatherData(city) {
    return axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`).then(result_curr => {
        return {
            current_weather: result_curr.data,
        }
    }).catch(error => {
        console.log('error', error);
    })

};

getWeatherData('Bucharest');
// we'll pass the client to the sendm function
// si ulterior o sa fie iterata intr-un for pentru a trimite mailuri la toti userii din baza de date


async function sendm(weather, client) {
    console.log(weather);
    let config = {
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        }
    };

    let transporter = nodemailer.createTransport(config);

    let mailgenerator = new mailgen({
        theme: 'default',
        product: {
            name: 'WeatherApp',
            link: 'http://localhost:5000'
        },
    });

    let response = {
        body: {
            name: 'Friend',
            intro: 'Be sure to take an umbrella with you today, it\'s going to rain!',
            table: {
                data: [
                    {
                        City: `${weather.name}`,
                        Temperature: `${Math.round(weather.main.temp)}°C`,
                        Humidity: `${weather.main.humidity} % `,
                    }
                ]
            },
            outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
        }
    };

    let mail = mailgenerator.generate(response);

    let message = {
        from: `WeatherApp user`,
        to: client,
        subject: 'Welcome to Weather App!',
        html: mail
    };

    if (weather.weather[0].id.toString().charAt(0) == '8') {
        await transporter.sendMail(message).then(() => {
            console.log('mail sent succesfully');
        }).catch(error => {
            console.log('error occured');
            console.log(error.message);
        });
    }
}

// sendm();

var ipapi = require('ipapi.co');

initializePassport(passport);
require("dotenv").config();

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


class oras_favorit {
    constructor(name, temp, icon) {
        this.name = name;
        this.temp = temp;
        this.icon = icon;
    }
};

app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("register");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
    res.render("login");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {

    var fav_city = [];
    let promises = [];


    pool.query('Select UNNEST(favorite) from users where id = $1', [req.user.id], (err, result) => {
        if (err) {
            throw err;
        } else {
            set_fav_city(result.rows);
        }
    });

    function set_fav_city(value) {
        fav_city = value;
        console.log(fav_city.length);
        console.log(fav_city);

        for (let i = 0; i < fav_city.length; i++) {
            console.log(fav_city[i].unnest);
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${fav_city[i].unnest}&units=metric&appid=${apiKey}`;
            // we use promises to ensure that all requests are completed before we render the page
            let promise = new Promise((resolve, reject) => {
                request(url, function (err, response, body) {
                    if (err) {
                        reject(err);
                    } else {
                        let weather = JSON.parse(body);
                        console.log(weather);
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
                res.render("dashboard", { orase_favorite: fav_city, user: req.user.name });
            })
            .catch((error) => {
                console.log(error);
                res.send("An error occurred.");
            });
    }



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

app.get("/users/dashboard/:oras", function (req, res) {

    city = req.params.oras;
    city = city.replace('ă', 'a');
    city = city.replace('â', 'a');
    city = city.replace('î', 'i');
    city = city.replace('ș', 's');
    city = city.replace('ş', 's');
    city = city.replace('ț', 't');
    city = city.replace('Ă', 'A');
    city = city.replace('Â', 'A');
    city = city.replace('Î', 'I');
    city = city.replace('Ș', 'S');
    city = city.replace('Ş', 'S');
    city = city.replace('Ț', 'T');

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

    city = req.params.oras;

    city = city.replace('ă', 'a');
    city = city.replace('â', 'a');
    city = city.replace('î', 'i');
    city = city.replace('ș', 's');
    city = city.replace('ş', 's');
    city = city.replace('ț', 't');
    city = city.replace('Ă', 'A');
    city = city.replace('Â', 'A');
    city = city.replace('Î', 'I');
    city = city.replace('Ș', 'S');
    city = city.replace('Ş', 'S');
    city = city.replace('Ț', 'T');

    console.log(city);
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
    console.log(city_auto);
};

app.get("/locatie_automata", function (req, res) {

    // let ip = req.ip; daca aplicatia ar fi pe net
    // let ip = '188.24.29.24'; Cluj
    // Bucuresti
    let ip = '45.250.65.105';
    console.log(ip);
    // Get city name passed in the form
    ipapi.location(callback, ip);
    let city = city_auto;
    console.log(city);
    console.log("da");
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

app.get(["/add_city/:city", "/users/dashboard/add_city/:city"], checkNotAuthenticated, (req, res) => {
    let city = req.params.city;
    city = city.split(',')[0];

    city = city.replace('ă', 'a');
    city = city.replace('â', 'a');
    city = city.replace('î', 'i');
    city = city.replace('ș', 's');
    city = city.replace('ş', 's');
    city = city.replace('ț', 't');
    city = city.replace('Ă', 'A');
    city = city.replace('Â', 'A');
    city = city.replace('Î', 'I');
    city = city.replace('Ș', 'S');
    city = city.replace('Ş', 'S');
    city = city.replace('Ț', 'T');

    const id = req.user.id;

    pool.query('SELECT UNNEST(favorite) FROM users WHERE id = $1', [req.user.id], (err, result) => {
        if (err) {
            req.flash("error", "City could not be added to favorites");
            const red = "/" + city;
            return res.redirect(red);


        } else {
            // get rows as array
            const rows = result.rows;
            const fav = [];
            for (let i = 0; i < rows.length; i++) {
                fav.push(rows[i].unnest);
            }

            if (fav.includes(city)) {
                req.flash("error", "City already in favorites");
                const red = "/" + city;
                return res.redirect(red);
            } else if (result.rows.length == 0) {
                pool.query('UPDATE users SET favorite = ARRAY[$1] WHERE id = $2', [city, id], (err, result) => {
                    if (err) {
                        throw err;
                    } else {
                        console.log("City added");
                        req.flash("success_msg", "City added to favorites");
                        const red = "/" + city;
                        return res.redirect(red);
                    }
                });
            } else {
                pool.query('UPDATE users SET favorite = array_append(favorite, $1) WHERE id = $2', [city, id], (err, result) => {
                    if (err) {
                        throw err;
                    } else {
                        console.log("City added");
                        req.flash("success_msg", "City added to favorites");
                        const red = "/" + city;
                        return res.redirect(red);
                    }
                });
            }
        }
    });
    console.log(city);
    console.log(id);
});

app.get("/users/dashboard/remove_city/:city", checkNotAuthenticated, (req, res) => {
    let city = req.params.city;
    city = city.split(',')[0];

    city = city.replace('ă', 'a');
    city = city.replace('â', 'a');
    city = city.replace('î', 'i');
    city = city.replace('ș', 's');
    city = city.replace('ş', 's');
    city = city.replace('ț', 't');
    city = city.replace('Ă', 'A');
    city = city.replace('Â', 'A');
    city = city.replace('Î', 'I');
    city = city.replace('Ș', 'S');
    city = city.replace('Ş', 'S');
    city = city.replace('Ț', 'T');

    const id = req.user.id;

    pool.query('UPDATE users SET favorite = array_remove(favorite, $1) WHERE id = $2', [city, id], (err, result) => {
        if (err) {
            req.flash("error", "City could not be removed from favorites");
            const red = "/users/dashboard";
            return res.redirect(red);
        } else {
            console.log("City deleted");
            req.flash("success_msg", "City removed from favorites");
            const red = "/users/dashboard";
            return res.redirect(red);
        }
    });
});
app.listen(5000, function () {
    console.log("Weather app listening on port 5000!");
});