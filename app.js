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
    "trans_id": String,
    "user_id": String,
});
var Transaction = mongoose.model('Transaction', transactionSchema);
// routes
app.get('/', getRecurringTransactions);

// endpoint logic
function findRecurrence(callback) {
    Transaction.aggregate([{$sort:{"name":1}}
        ]).then(function(res) {
            callback(null, res);
    });
}
async function upsertTransactions(req, res) {
    console.log(req.body);
    var data = req.body;
    // list of transactions
    if (data[0]) {
        await Transaction.insertMany(data, function(err) {
            if (err) return console.log(err);
            console.log("saved multiple entries to database");
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
        console.log(data);
        var lookup = {};
        for(var i = 0; i < data.length; i++) {
            var name = getName(data[i].name);
            var newDate = new Date(data[i].date);
            var newData = { "name": data[i].name, "date": newDate, "amount": data[i].amount, "trans_id": data[i].trans_id, "user_id": data[i].user_id};
            if (lookup[name]) {    
                lookup[name].push(newData);
            }
            else {
                lookup[name] = [newData];
            }
        }
        var results = [];
        // sort transactions by chronological order then find recurrences
        for (var bill in lookup) {
            lookup[bill] = sortChronological(lookup[bill]);
            var x = findRecurrences(lookup[bill]);
            if (x) {
                results.push(x);
            }
        }
        console.log("RESULTS ARE:");
        console.log(results);
        res.send(results);
    })
}
function getRecurringTransactions(req, res) {
    findRecurrence((err, data) => {
        var lookup = {};
        for(var i = 0; i < data.length; i++) {
            var name = getName(data[i].name);
            var newDate = new Date(data[i].date);
            var newData = { "name": data[i].name, "date": newDate, "amount": data[i].amount, "trans_id": data[i].trans_id, "user_id": data[i].user_id};
            if (lookup[name]) {    
                lookup[name].push(newData);
            }
            else {
                lookup[name] = [newData];
            }
        }
        
        var results = [];
        // sort transactions by chronological order then find recurrences
        for (var bill in lookup) {
            lookup[bill] = sortChronological(lookup[bill]);
            var x = findRecurrences(lookup[bill]);
            if (x) {
                results.push(x);
            }
        }
        res.send(results);
    })    
}

// helper methods
function getName(s) {
    var words = s.split(' ');
    if (words.length == 1) {
        console.log("transaction name is 1 word: "+words[0]);
        return words[0];
    }
    let i = 0;
    var newName = '';
    while (isNaN(parseInt(words[i])) && i < words.length) {
        newName+=words[i]
        i+=1
    }
    console.log("transaction new name is:" + newName);
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
function findRecurrences(arr) {
    // 1. check number of transactions for name
    // 2. check other most recent transaction and determine if dates follow a pattern
    // 3. check transaction amounts

    // there is only one transaction for this name and not recurring
    if (arr.length <= 1) {
        console.log("only 1 transaction, cannot be sure if is recurring transaction or not");
        return;
    }
    var o = {"name": arr[0].name, "user_id": arr[0].user_id};
    var recurring = checkTimePeriods(arr);
    if (recurring) {
        o['next_amt'] = recurring[recurring.length-2];
        o['next_date'] = recurring[recurring.length-1];
        o['transactions'] = recurring.slice(1,recurring.length-2);   
        return o;    
    }
    return;

}
function checkTimePeriods(arr) {
    var diff = (arr[0].date - arr[1].date)/(1000*60*60*24);
    var sept = new Date("2018-08-15T00:00:00.000Z")
    if (358 <= diff && diff <= 372) {
        // most recent transaction is too old and most likely not recurring
        if((sept - arr[0].date)/(1000*60*60*24) > 729) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return checkYearly(arr);
    }
    // monthly recurrence
    if (28 <= diff && diff <= 32) {
        if((sept - arr[0].date)/(1000*60*60*24) > 59) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return checkMonthly(arr);
    }
    // biweekly recurrence
    if (12 <= diff && diff <= 16) {
        if((sept - arr[0].date)/(1000*60*60*24) > 27) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return checkBiweekly(arr);
    }
    // weekly recurrence
    if (5 <= diff && diff <= 9) {
        if((sept - arr[0].date)/(1000*60*60*24) > 13) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return checkWeekly(arr);
    }
    // daily recurrence
    if (1 <= diff && diff <= 2) {
        // most recent transaction is too old and most likely not recurring
        if((sept - arr[0].date)/(1000*60*60*24) > 2) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return []
        }
        return checkDaily(arr);
    }
}
function checkYearly(arr) {
    var res = ["yearly"];
    var diff = 365;
    var offset = 1;
    var amounts = [];
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(1000*60*60*24));
        if(Math.abs(newDiff - diff) > 7) {
            // does not follow monthly pattern, skip transaction
            offset+=1
            continue;
        } 
        else {
            offset=1
            amounts.push(arr[i].amount);
            res.push(arr[i]);
        }
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;
    var nextDate = new Date(arr[0].date);
    nextDate.setFullYear(nextDate.getFullYear()+1);
    res.push(avg);
    res.push(nextDate);
    return res;
}
function checkMonthly(arr) {
    var res = ["monthly"];
    var diff = 30;
    var offset = 1;
    var amounts = [];
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(1000*60*60*24));
        // console.log("newDiff%diff: " + newDiff); 
        if(Math.abs(newDiff - diff) > 3) {
            // does not follow monthly pattern, skip transaction
            offset+=1
            continue;
        } 
        else {
            offset=1
            amounts.push(arr[i].amount);
            res.push(arr[i]);
        }  
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + 1000*60*60*24*30);
    res.push(avg);
    res.push(nextDate);
    return res;
}
function checkBiweekly(arr) {
    var res = ["biweekly"];
    var diff = 14;
    var offset = 1;
    var amounts = [];
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(1000*60*60*24));
        // console.log("newDiff%diff: " + newDiff); 
        if(Math.abs(newDiff - diff) > 3) {
            // does not follow monthly pattern, skip transaction
            offset+=1
            continue;
        } 
        else {
            offset=1
            amounts.push(arr[i].amount);
            res.push(arr[i]);
        }
        // console.log((arr[0].date - arr[i].date)/(1000*60*60*24));    
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + 1000*60*60*24*14);
    res.push(avg);
    res.push(nextDate);
    return res;
}
function checkWeekly(arr) {
    var res = ["weekly"];
    var diff = 7;
    var offset = 1;
    var amounts = [];
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(1000*60*60*24));
        if(Math.abs(newDiff - diff) > 1) {
            // does not follow monthly pattern, skip transaction
            offset+=1
            continue;
        } 
        else {
            offset=1
            amounts.push(arr[i].amount);
            res.push(arr[i]);
        }
        // console.log((arr[0].date - arr[i].date)/(1000*60*60*24));    
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;;
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + 1000*60*60*24*7);
    res.push(avg);
    res.push(nextDate);
    return res;
}
function checkDaily(arr) {
    var res = ["daily"];
    var diff = 1;
    var offset = 1;
    var amounts = [];
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(1000*60*60*24));
        // console.log("newDiff%diff: " + newDiff); 
        if(Math.abs(newDiff - diff) > 1) {
            // does not follow monthly pattern, skip transaction
            offset+=1;
            continue;
        } 
        else {
            offset=1;
            amounts.push(arr[i].amount);
            res.push(arr[i]);
        }
        // console.log((arr[0].date - arr[i].date)/(1000*60*60*24));    
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    );
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + 1000*60*60*24);
    res.push(avg);
    res.push(nextDate);
    return res;
}
