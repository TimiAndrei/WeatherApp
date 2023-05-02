const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const bcrypt = require("bcrypt");
const { pool } = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const fs = require('fs');
const initializePassport = require("./passportConfig");
const nodemailer = require('nodemailer');
const mailgen = require('mailgen');
const axios = require('axios');
const CronJob = require('cron').CronJob;
const apiKey = `${process.env.API_KEY}`;
const user = `${process.env.USER}`;
const pass = `${process.env.PASS}`;
var ipapi = require('ipapi.co');

function get_client_alert_data() {
    return new Promise((resolve, reject) => {
        pool.query('select email, oras_default, name from users WHERE alert = true', (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.rows);
            }
        });
    });
}

const cronJob = new CronJob('0 0 8 * * *', run);
cronJob.start();

async function run() {
    try {
        const client_data = await get_client_alert_data();
        for (let i = 0; i < client_data.length; i++) {
            const weatherData = await getWeatherData(client_data[i].oras_default);
            await sendm(weatherData.current_weather, client_data[i]);
        }
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


async function sendm(weather, client, special = 0) {

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
    let response
    if (special == 1 && weather != null) {
        response = {
            body: {
                name: `${client.name}`,
                intro: 'Thank you for subscribing to our daily weather forecast!',
                table: {
                    data: [
                        {
                            City: `${weather.name}`,
                            Temperature: `${Math.round(weather.main.temp)}°C`,
                            Humidity: `${weather.main.humidity} % `,
                        }
                    ]
                },
                outro: 'We hope to inform you about the weather in your city every day! If you have any questions, please contact us !'
            }
        };
    }
    else if (special == 1 && weather == null) {
        response = {
            body: {
                name: `${client.name}`,
                intro: 'Thank you for subscribing to our daily weather forecast! Please make sure to set your default city in your profile to get weather information!',

                outro: 'We hope you\'ll have a great day, no matter the weather!'
            }
        };
    }
    else if (weather != null) {


        if (weather.weather[0].id.toString().charAt(0) == '2') {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Take care, there is a thunderstorm in your city!',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great day, no matter the weather!'
                }
            };
        }
        else if (weather.weather[0].id.toString().charAt(0) == '3') {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Today there is a drizzle in your city!',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great day, no matter the weather!'
                }
            };
        }
        else if (weather.weather[0].id.toString().charAt(0) == '5') {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Make sure to bring an umbrella with you, today is raining !',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great day, no matter the weather!'
                }
            };
        }
        else if (weather.weather[0].id.toString().charAt(0) == '6') {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Make sure to bring a coat with you, today is snowing !',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great day, no matter the weather!'
                }
            };
        }
        else if (weather.weather[0].id.toString().charAt(0) == '7') {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Today is foggy in your city!',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great day, no matter the weather!'
                }
            };
        }
        else if (weather.weather[0].id.toString().charAt(0) == '8') {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Today is gonna be a sunny day in town ! ',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great sunny day!'
                }
            };
        }
        else {
            response = {
                body: {
                    name: `${client.name}`,
                    intro: 'Here is the weather for today!',
                    table: {
                        data: [
                            {
                                City: `${weather.name}`,
                                Temperature: `${Math.round(weather.main.temp)}°C`,
                                Humidity: `${weather.main.humidity} % `,
                            }
                        ]
                    },
                    outro: 'We hope you\'ll have a great day, no matter the weather!'
                }
            };
        }
    }




    let mail = mailgenerator.generate(response);

    let message = {
        from: `WeatherApp user`,
        to: client.email,
        subject: 'Weather App alert!',
        html: mail
    };


    await transporter.sendMail(message).then(() => {
        console.log('mail sent succesfully');
    }).catch(error => {
        console.log('error occured');
        console.log(error.message);
    });
}

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

app.get("/set_alerte", checkNotAuthenticated, (req, res) => {

    console.log("ALERTA");
    console.log(req.query.alert)
    pool.query('SELECT alert FROM users WHERE id = $1', [req.user.id], (err, result) => {
        console.log("alert");
        console.log(result.rows[0].alert);
        if (result.rows[0].alert == null || result.rows[0].alert == false) {
            console.log("Alerta true");
            req.flash('success_msg', "You have subscribed to the daily alerts! We have sent you an email to confirm your subscription!");

            if (req.user.oras_default) {
                let data = getWeatherData(req.user.oras_default);
                Promise.resolve(data).then(function (value) {
                    sendm(value.current_weather, req.user, 1);
                });
            } else {
                data = getWeatherData("Bucharest");
                Promise.resolve(data).then(function (value) {
                    sendm(null, req.user, 1);
                });
            }
            pool.query('UPDATE users SET alert = true WHERE id = $1', [req.user.id], (err, result) => {
            });
            res.redirect("/users/dashboard");
        } else {
            console.log("Alerta false")
            req.flash('success_msg', "You have unsubscribed from the daily alerts!");
            pool.query('UPDATE users SET alert = false WHERE id = $1', [req.user.id], (err, result) => {
            });
            res.redirect("/users/dashboard");
        }
    });
});

app.get("/set_oras_default/:oras", checkNotAuthenticated, (req, res) => {

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

    if (req.params.oras == req.user.oras_default) {
        pool.query('UPDATE users SET oras_default = NULL WHERE id = $1', [req.user.id], (err, result) => {
            if (err) {
                req.flash('error', 'City could not be set as default');
                res.redirect("/users/dashboard");
            }
            else {
                req.flash('error', 'City removed from default');
                res.redirect("/users/dashboard");
            }
        });
    }
    else {
        pool.query('UPDATE users SET oras_default = $1 WHERE id = $2', [city, req.user.id], (err, result) => {
            if (err) {
                req.flash('error', 'City could not be set as default');
                res.redirect("/users/dashboard");
            }
            else {
                req.flash('success_msg', 'City set as default');
                res.redirect("/users/dashboard");
            }
        });
    }

});

var city_auto = '';

var callback = function (res) {
    city_auto = res.city;
};

app.get("/locatie_automata", function (req, res) {

    // let ip = req.ip; if the app is deployed on the internet
    // let ip = '188.24.29.24'; Cluj
    // Bucuresti
    let ip = '45.250.65.105';
    ipapi.location(callback, ip);
    let city = city_auto;
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);


            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {
                let place = `${weather.name}, ${weather.sys.country}`,
                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;

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
    var alerts = 0;
    var oras_default = "";

    pool.query('Select oras_default from users where id = $1', [req.user.id], (err, result) => {
        if (err) {
            throw err;
        } else {
            oras_default = result.rows[0].oras_default;
        }
    });
    pool.query('Select UNNEST(favorite) from users where id = $1', [req.user.id], (err, result) => {
        if (err) {
            throw err;
        } else {
            set_fav_city(result.rows);
        }
    });

    pool.query('Select alert from users where id = $1', [req.user.id], (err, result) => {
        if (err) {
            throw err;
        } else {

            if (result.rows[0].alert == true) {
                alerts = 1;
            }

        }
    });
    function set_fav_city(value) {
        fav_city = value;

        for (let i = 0; i < fav_city.length; i++) {
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${fav_city[i].unnest}&units=metric&appid=${apiKey}`;
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
                res.render("dashboard", { orase_favorite: fav_city, user: req.user.name, alerts: alerts, oras_default: oras_default });
            })
            .catch((error) => {
                console.log(error);
                res.send("An error occurred.");
            });
    }



});

app.get("/users/dashboard/delete_account", checkNotAuthenticated, (req, res) => {
    const id = req.user.id;
    pool.query('DELETE FROM users WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.log("Account could not be deleted");
            req.flash("error", "Account could not be deleted");
            return res.redirect("/");
        }
        if (result.rowCount === 0) {
            console.log("No rows deleted");
            req.flash("error", "Account could not be deleted");
            return res.redirect("/");
        }
        console.log("Account deleted");
        req.flash("success_msg", "Account deleted");
        return res.redirect("/");

    });
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

    let city = req.body.city;

    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);

            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {

                let place = `${weather.name}, ${weather.sys.country}`,

                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;

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

    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);

            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {
                let place = `${weather.name}, ${weather.sys.country}`,
                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;

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

    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    request(url, function (err, response, body) {

        if (err) {
            res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
        } else {
            let weather = JSON.parse(body);

            if (weather.main == undefined) {
                res.render('index', { weather: null, error: 'Error, please try again', orase: lista_orase });
            } else {
                let place = `${weather.name}, ${weather.sys.country}`,
                    weatherTimezone = `${new Date(
                        weather.dt * 1000 - weather.timezone * 1000
                    )}`;
                let weatherTemp = `${weather.main.temp}`,
                    weatherPressure = `${weather.main.pressure}`,
                    weatherIcon = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    weatherDescription = `${weather.weather[0].description}`,
                    humidity = `${weather.main.humidity}`,
                    clouds = `${weather.clouds.all}`,
                    visibility = `${weather.visibility}`,
                    main = `${weather.weather[0].main}`,
                    weatherFahrenheit;
                weatherFahrenheit = (weatherTemp * 9) / 5 + 32;
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
    if (req.params.city == req.user.oras_default) {
        pool.query('UPDATE users SET favorite = array_remove(favorite, $1), oras_default = NULL WHERE id = $2', [city, id], (err, result) => {
            if (err) {
                throw err;
            } else {
                req.flash("error", "City removed from favorites but also from default!");
                res.redirect("/users/dashboard");
            }
        });
    }
    else {

        pool.query('UPDATE users SET favorite = array_remove(favorite, $1) WHERE id = $2', [city, id], (err, result) => {
            if (err) {
                req.flash("error", "City could not be removed from favorites");
                res.redirect("/users/dashboard");
            } else {
                console.log("City deleted");
                req.flash("success_msg", "City removed from favorites");
                res.redirect("/users/dashboard");
            }
        });
    }
});


app.listen(5000, function () {
    console.log("Weather app listening on port 5000!");
});