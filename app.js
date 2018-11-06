// author: orion ou
// date: 11/03/2018
// ==================== node modules ====================
const express = require('express');
const app = express();
const port = 1984;
const bodyParser = require('body-parser');
const routes = require('./routes');

// ==================== enable body parser for POST requests ====================
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// ==================== start server ====================
app.listen(port, () => console.log(`Server is listening on port ${port}!`));
app.use('/', routes);


