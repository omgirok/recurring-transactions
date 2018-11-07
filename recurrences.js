


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