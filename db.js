const mongoose = require('mongoose');
const MILLISECONDS_TO_DAY = 1000*60*60*24;

// ==================== mongodb connection ====================
mongoose.connect('mongodb://localhost:27017/interview_challenge', { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
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

module.exports.upsertTransactions = async function (req, res) {
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
        // group transactions by name
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
        // loop through each company
        for (var bill in lookup) {
            // sort transactions by chronological order
            lookup[bill] = sortChronological(lookup[bill]);
            // find recurrence frequency and determine next amount + next due date
            var x = findRecurrences(lookup[bill]);
            if (x) {
                results.push(x);
            }
        }
        res.send(results);
    })
}
function findRecurrence(callback) {
    Transaction.aggregate([{$sort:{"name":1}}
        ]).then(function(res) {
            callback(null, res);
    });
}

function findRecurrences(arr) {
    // 1. check number of transactions for this company
    if (arr.length < 3) {
        console.log(arr[0].name + " has less than 3 transactions, cannot be sure if there is a recurring transaction or not");
        return;
    }
    // 2. determine if dates follow a recurrence pattern, and return the transactions that do
    //    follow a recurrence pattern
    var freq = findFrequency(arr);
    if (freq == -1) {
        console.log("not enough data to be sure of a recurrence");
    }
    else {
        if (freq) {
            // o['next_amt'] = recurring[recurring.length-2];
            // o['next_date'] = recurring[recurring.length-1];
            // o['transactions'] = recurring.slice(1,recurring.length-2);   
            return freq;    
        }
        // 3. check transaction amounts

    }
    // var o = {"name": arr[0].name, "user_id": arr[0].user_id};
    // var recurring = checkTimePeriods(arr);
    // if (recurring) {
    //     o['next_amt'] = recurring[recurring.length-2];
    //     o['next_date'] = recurring[recurring.length-1];
    //     o['transactions'] = recurring.slice(1,recurring.length-2);   
    //     return o;    
    // }
    // return o;

}
function findFrequency(arr) {
    var maxElems = [arr[0]];
    // handle 3 transactions manually
    if (arr.length == 3) {
        var diff1 = (arr[0].date - arr[1].date)/(MILLISECONDS_TO_DAY);
        var diff2 = (arr[1].date - arr[2].date)/(MILLISECONDS_TO_DAY);
        if (Math.abs(diff1 - diff2) > 3) {
            return -1;
        }
        else {
            var elem = frequencyFinder(arr.slice(i), diff1);
            if (elem[1] > maxElems.length) {
                maxElems = elem[2];
            }
            return maxElems;
        }
    }
    // try comparing every transaction with every other transaction
    // this can help filter out noise which occurs at irregular frequencies
    else {
        for(var i = 0; i < arr.length-1; i++) {
            if (maxElems.length > arr.length-i) {
                console.log("BREAKING");
                break;
            }
            for(var j = i+1; j < arr.length; j++) {
                // determine if there are transactions that follow some sort of
                // normal recurrence frequency and check for those transactions
                var diff = Math.floor((arr[i].date - arr[j].date)/(MILLISECONDS_TO_DAY));
                diff = checkDiff(diff);
                if (diff != -1) {
                    var elem = frequencyFinder(arr.slice(i), diff);
                    if (elem[1] > maxElems.length) {
                        maxElems = elem[2];
                    }
                }   
            }
        }
        return maxElems;
    }
}
function checkDiff(diff) {
    if (358 <= diff && diff <= 372) {
        return 365;
    }
    if (83 <= diff && diff <= 97) {
        return 90;
    }
    if (56 <= diff && diff <= 64) {
        return 60;
    }
    if (28 <= diff && diff <= 32) {
        return 30;
    }
    if (12 <= diff && diff <= 17) {
        return 15
    }
    if (5 <= diff && diff <= 9) {
        return 7
    }
    if (1 <= diff && diff <= 2) {
        return 1
    }
    return -1;
}
function frequencyFinder(arr, diff) {
    var results = [];
    var amounts = [];
    var offset = 0;
    var nextDiff = 0;

    for(var i = 1; i < arr.length; i++) {
        nextDiff += Math.floor((arr[i-1].date - arr[i].date)/(MILLISECONDS_TO_DAY));
        // lower and upper bound determines the margin of error between transactions
        // ex: for monthly transactions, give a margin of +-(3.5+offset/3) days
        // if recurrences were strict then transactions would occur on
        //    0,      30,      60,      90,      120,    etc.
        // with margin of error transaction can occure anywhere between
        // [-3,3], [27,33], [56,64], [86,94], [116,124],   etc.
        var lowerBound = Math.ceil(diff*offset - (3.5+offset/3));
        var upperBound = Math.floor(diff*offset + (3.5+offset/3));
        if (lowerBound <= (nextDiff-diff) && ((nextDiff-diff) <= upperBound)) {
            results.push(arr[i]);
            offset+=1
        }
    }
    var nextDate = new Date(arr[0].date);
    nextDate.setFullYear(nextDate.getTime()+MILLISECONDS_TO_DAY*diff);

    results = [arr[0]].concat(results);
    return [diff,results.length,results];
}

function checkTimePeriods(arr) {
    //var freq = findRecurrenceFrequency(arr);
    var diff = (arr[0].date - arr[1].date)/(MILLISECONDS_TO_DAY);
    var sept = new Date("2018-08-15T00:00:00.000Z")
    if (358 <= diff && diff <= 372) {
        // most recent transaction is too old and most likely not recurring
        if((sept - arr[0].date)/(MILLISECONDS_TO_DAY) > 729) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return getTransactionsForFrequency(arr, "yearly", 365);
    }
    // monthly recurrence
    if (28 <= diff && diff <= 32) {
        if((sept - arr[0].date)/(MILLISECONDS_TO_DAY) > 59) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return getTransactionsForFrequency(arr, "monthly", 30);
    }
    // biweekly recurrence
    if (12 <= diff && diff <= 16) {
        if((sept - arr[0].date)/(MILLISECONDS_TO_DAY) > 27) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return getTransactionsForFrequency(arr, "biweekly", 14);
    }
    // weekly recurrence
    if (5 <= diff && diff <= 9) {
        if((sept - arr[0].date)/(MILLISECONDS_TO_DAY) > 13) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return;
        }
        return getTransactionsForFrequency(arr, "weekly", 7);
    }
    // daily recurrence
    if (1 <= diff && diff <= 2) {
        // most recent transaction is too old and most likely not recurring
        if((sept - arr[0].date)/(MILLISECONDS_TO_DAY) > 2) {
            console.log("most recent transaction for " + arr[0].name + " is too far into the past");
            return []
        }
        return checkDaily(arr);
    }
}
function getTransactionsForFrequency(arr, freq, diff) {
    var res = [freq]
    var offset = 1;
    var amounts = [];
    // assumes first transaction is the most recent recurring transaction
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(MILLISECONDS_TO_DAY));
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
function checkYearly(arr) {
    var res = ["yearly"];
    var diff = 365;
    var offset = 1;
    var amounts = [];
    res.push(arr[0]);
    for(var i = 1; i < arr.length; i++) {
        // console.log("diff: " + diff);
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(MILLISECONDS_TO_DAY));
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
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(MILLISECONDS_TO_DAY));
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
    nextDate.setTime(nextDate.getTime() + MILLISECONDS_TO_DAY*30);
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
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(MILLISECONDS_TO_DAY));
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
        // console.log((arr[0].date - arr[i].date)/(MILLISECONDS_TO_DAY));    
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + MILLISECONDS_TO_DAY*14);
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
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(MILLISECONDS_TO_DAY));
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
        // console.log((arr[0].date - arr[i].date)/(MILLISECONDS_TO_DAY));    
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;;
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + MILLISECONDS_TO_DAY*7);
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
        var newDiff = Math.ceil((arr[i-offset].date - arr[i].date)/(MILLISECONDS_TO_DAY));
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
        // console.log((arr[0].date - arr[i].date)/(MILLISECONDS_TO_DAY));    
    }
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    );
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime() + MILLISECONDS_TO_DAY);
    res.push(avg);
    res.push(nextDate);
    return res;
}

// ==================== helper methods ====================
function getName(s) {
    var words = s.split(' ');
    if (words.length == 1) {
        // console.log("transaction name is 1 word: "+words[0]);
        return words[0];
    }
    let i = 0;
    var newName = '';
    while (i < words.length) {
        if (hasNumber(words[i])) {
            i+= words.length;
        }
        else {
            newName+=words[i];
            i+=1;
        }
    }
    // console.log("transaction new name is:" + newName);
    return newName;
}
function hasNumber(s) {
    for(var i = 0; i < s.length; i++) {
        if(!isNaN(parseInt(s[i]))) {
            return true;
        }
    }
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