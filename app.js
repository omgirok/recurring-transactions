// include node modules
const express = require('express');
const app = express();
const port = 1984;
const bodyParser = require('body-parser');
const mongodb = require('mongodb').MongoClient;


// mongodb 
var url = "mongodb://localhost:27017/interview_challenge";
var option = { 'useNewUrlParser': true };

mongodb.connect(url, option, function(err, db) {
    if (err) {
        console.log(err);
    } 
    console.log("Database created!");
});


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// routes
app.get('/', getRecurringTransactions);
app.post('/', upsertTransactions);

// setup server
app.listen(port, () => console.log(`Server is listening on port ${port}!`));

function getRecurringTransactions(req, res) {
    
    return;
}

function upsertTransactions(req, res) {
    return;
}