const convertExcel = require('excel-as-json').processFile;

convertExcel('transactions.xlsx', 'data.json', null, function(err,data) {
    if (err) {
        console.log(err);
    }
});
