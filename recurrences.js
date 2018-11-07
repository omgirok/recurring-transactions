const MILLISECONDS_TO_DAY = 1000*60*60*24;

// ==================== recurrence logic ====================
module.exports.findCompanies = function(data) {
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
    console.log(lookup);
    return lookup;
}
module.exports.findRecurrences = function(arr) {
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
        return
    }
    // 3. check dates on recurrences
    // var now = Date.now();
    var now = new Date("2018-08-15T00:00:00.000Z");
    var nextDate = freq[freq.length-1];
    if (nextDate - now < 0) {
        console.log("recurrence stopped awhile ago");
        return;
    }
    // 4. filter amounts that aren't within +-20% of the average amount
    var avg = freq[freq.length-2];
    var transactions = freq.slice(0,freq.length-2).filter((item) => {
        return Math.abs(item.amount) >= Math.abs(avg*.08) && Math.abs(item.amount) <= Math.abs(avg*1.2);
    });

    // 5. return recurring transactions with high confidence that the transactions are recurring
    var o = {"name": arr[0].name, "user_id": arr[0].user_id};
    o['next_amt'] = avg;
    o['next_date'] = nextDate;
    o['transactions'] = transactions;   
    return o;
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
            var elem = finder(arr, diff1);
            if (elem && elem[0] > maxElems.length) {
                maxElems = elem[1];
            }
            return maxElems;
        }
    }
    // try comparing every transaction with every other transaction
    // this can help filter out noise which occurs at irregular frequencies
    else {
        for(var i = 0; i < arr.length-1; i++) {
            if (maxElems.length > arr.length-i) {
                break;
            }
            for(var j = i+1; j < arr.length; j++) {
                // determine if there are transactions that follow some sort of
                // normal recurrence frequency and check for those transactions
                var diff = checkDiff(Math.floor((arr[i].date - arr[j].date)/(MILLISECONDS_TO_DAY)));
                if (diff != -1) {
                    var elem = finder(arr.slice(i), diff);
                    if (elem && elem[0] > maxElems.length) {
                        maxElems = elem[1];
                    }
                }   
            }
        }
        return maxElems;
    }
}
function finder(arr, diff) {
    var results = [];
    var offset = 0;
    var nextDiff = 0;
    var amounts = [];
    // lowerBound and upperBound determines the margin of error between transactions
    // ex: for monthly transactions, give a margin of +-(3.5+offset/3) days
    // if recurrences were strict then transactions would occur on
    //    0,      30,      60,      90,      120,    etc.
    // with margin of error transaction can occure anywhere between
    // [-3,3], [27,33], [56,64], [86,94], [116,124],   etc.
    for(var i = 1; i < arr.length; i++) {
        nextDiff += Math.floor((arr[i-1].date - arr[i].date)/(MILLISECONDS_TO_DAY));
        var lowerBound = Math.ceil(diff*offset - (3.5+offset/3));
        var upperBound = Math.floor(diff*offset + (3.5+offset/3));
        if (lowerBound <= (nextDiff-diff) && ((nextDiff-diff) <= upperBound)) {
            results.push(arr[i]);
            amounts.push(arr[i].amount);
            offset+=1
        }
    }
    // also send next expected transaction date
    var nextDate = new Date(arr[0].date);
    nextDate.setTime(nextDate.getTime()+MILLISECONDS_TO_DAY*diff);
    // also send average amount
    var avg = amounts.reduce(
        ( accumulator, currentValue ) => accumulator + currentValue,
        0
    ) / amounts.length;
    
    results = [arr[0]].concat(results);
    results.push(avg);
    results.push(nextDate);
    return [results.length,results];
}
// ==================== helper methods ====================
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