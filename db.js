const recurrences = require('./recurrences');
const mongoose = require('mongoose');

// ==================== mongodb connection ====================
mongoose.connect('mongodb://localhost:27017/interview_challenge', { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("connected to mongodb!");
});

// ==================== schema definition ====================
var transactionSchema = new mongoose.Schema({
    "name": String,
    "date": String,
    "amount": Number,
    "trans_id": String,
    "user_id": String,
});
var Transaction = mongoose.model('Transaction', transactionSchema);

// ==================== endpoint logic ====================
module.exports.getRecurringTransactions = function (req, res) {
    findRecurrence((err, data) => {
        // group transactions by name
        var lookup = recurrences.findCompanies(data);
        var results = [];
        console.log(lookup);
        // loop through each company
        for (var bill in lookup) {
            // sort transactions by chronological order
            lookup[bill] = sortChronological(lookup[bill]);
            // find recurrence frequency and determine next amount + next due date
            var x = recurrences.findRecurrences(lookup[bill]);
            if (x) {
                results.push(x);
            }
        }
        res.send(results);
    })    
}
module.exports.upsertTransactions = async function (req, res) {
    console.log(req.body);
    var data = req.body;
    // list of transactions
    if (data[0]) {
        await Transaction.insertMany(data, function(err) {
            if (err) return console.log(err);
            console.log("saved multiple entries to database");
            console.log("saved data: " + data);
        })
    }
    // one transaction
    else {
        var t = new Transaction(data);
        await t.save(function(err) {
            if (err) return console.log(err);
            console.log("saved " + t + " to database");  
        })
    }
    findRecurrence((err, data) => {
        // group transactions by name
        var lookup = recurrences.findCompanies(data);
        var results = [];
        // loop through each company
        for (var bill in lookup) {
            // sort transactions by chronological order
            lookup[bill] = sortChronological(lookup[bill]);
            // find recurrence frequency and determine next amount + next due date
            var x = recurrences.findRecurrences(lookup[bill]);
            if (x) {
                results.push(x);
            }
        }
        res.send(results);
    })
}

// ==================== helper methods ====================
function findRecurrence(callback) {
    Transaction.aggregate([{$sort:{"name":1}}
        ]).then(function(res) {
            callback(null, res);
    });
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