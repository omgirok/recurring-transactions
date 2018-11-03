// include node modules
const express = require('express');
const app = express();
const port = 1984;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// mongodb connection
mongoose.connect('mongodb://localhost:27017/interview_challenge', { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("hi");
});

// enable body parser for POST requests
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


app.post('/', upsertTransactions);

// start server
app.listen(port, () => console.log(`Server is listening on port ${port}!`));

// schema definition
var transactionSchema = new mongoose.Schema({
    "name": String,
    "date": String,
    "amount": Number,
    "trans_id": Number,
    "user_id": Number,
});
var Transaction = mongoose.model('Transaction', transactionSchema);


    // Transaction.find({},function(err, results) {
    //     if (err) {
    //         console.log(err);
    //     }
    //     // console.log(results);
    //     var data = results;
    //     var store = {};
    //     for(var i = 0; i < data.length; i++) {
    //         var name = data[i].name;
    //         console.log(name);
    //         if (store[name]) {

    //         }
    //     }
    // });
// routes
app.get('/', getRecurringTransactions);
// endpoint logic

function findRecurrence(callback) {
    Transaction.aggregate([{$sort:{"name":1}}
        ]).then(function(res) {
            callback(null, res);
    });
    // Transaction.find({}, function(err, results) {
    //     if (err) console.log(err);
    //     else callback(null,results);
    // })
    // console.log(data);
    // return data;
}
function getName(s) {
    var words = s.split(' ');
    if (words.length == 1) {
        // console.log("transaction name is 1 word: "+words[0]);
        return words[0];
    }
    let i = 0;
    var newName = '';
    
    while (isNaN(parseInt(words[i])) && i < words.length) {
        newName+=words[i]
        i+=1
    }
    // console.log("transaction new name is:" + newName);
    return newName;
}
function sortChronological(arr) {
    function compare(a,b) {
        if (a.date < b.date)
          return 1;
        if (a.date > b.date)
          return -1;
        return 0;
    }
    return arr.sort(compare);
}
function getRecurringTransactions(req, res) {
    // findRecurrence();
    // console.log(x);
    findRecurrence((err, data) => {
        // console.log(data);
        var lookup = {};
        for(var i = 0; i < data.length; i++) {
            var name = getName(data[i].name);
            var newDate = new Date(data[i].date);
            // console.log(name,newDate);
            var newData = { "date": newDate, "amount": data[i].amount, "trans_id": data[i].trans_id, "user_id": data[i].user_id, "is_recurring": data[i].is_recurring };
            if (lookup[name]) {    
                lookup[name].push(newData);
            }
            else {
                // var sept = new Date("2018-09-01T00:00:00.000Z")
                // if (Math.floor((sept - newData.date)/(1000*60*60*24)) < 30) { // transaction was within the last 30 days
                lookup[name] = [newData];
            }
        }
        // sort transactions by chronological order
        for (var bill in lookup) {
            lookup[bill] = sortChronological(lookup[bill]);
        }
        
        res.send(lookup);
    })    
}

function upsertTransactions(req, res) {
    console.log(req.body);
    var data = req.body;
    // list of transactions
    if (data[0]) {
        Transaction.insertMany(data, function(err) {
            if (err) return console.log(err);
            console.log("saved multiple entries to database");
        })
    }
    // one transaction
    else {
        var t = new Transaction(data);
        t.save(function(err) {
            if (err) return console.log(err);
            console.log("saved " + t + " to database");
        })
    }

    res.send();
}
