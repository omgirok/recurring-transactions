const express = require('express');
const app = express();
const db = require('./db');


// ==================== routes ====================
app.post('/', db.upsertTransactions);
app.get('/', db.getRecurringTransactions);

module.exports = app;


