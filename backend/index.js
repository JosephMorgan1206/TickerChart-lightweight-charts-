const express = require("express");
const app = express(); 
const cors  = require("cors");
const axios = require("axios");
const WebSocket = require('ws');
const dotenv = require("dotenv");
const moment = require("moment");
const db_stock = require('./db/stock');
const db_finland = require('./db/finland')

dotenv.config();
app.use(cors());
const ws_url = 'wss://ws.eodhistoricaldata.com/ws/us?api_token=63bf6ecd8c46c5.53082791';

var time_one_min = new Date().getTime();
var time_five_min = new Date().getTime();
var time_one_day = new Date().getTime();
var oneStreamData = [];
var fiveStreamData = [];
var dailyStreamData = [];
var flag = false;
var count = 0;

const startWebsocket = () => {
    var ws = new WebSocket(ws_url)
    ws.onopen = () => {
        const msg = { action: "subscribe", symbols: "TSLA" };
        ws.send(JSON.stringify(msg));
    }
  
    ws.onmessage = function(e){
        let data = JSON.parse(e.data)
        if(data.t && !flag) {            
            time_one_min = data.t;
            time_five_min = data.t;
            time_one_day = data.t;
            oneStreamData.push(data);
            fiveStreamData.push(data);
            dailyStreamData.push(data);
            flag = true;
        }

        data.t && oneStreamData.push(data);
        if(data.t && timeOneMinDiff(data.t)) {
            let value = convertToOHLC(oneStreamData, 1);
            db_stock.query('INSERT INTO staging.interval_1m (country, code, timestamp, gmtoffset, datetime, open, close, high, low, volume) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', ['us', value.code, value.timestamp, 0, moment(value.timestamp).format('YYYY-MM-DD hh:mm'), value.open, value.close, value.high, value.low, value.volume])
            oneStreamData = [];
            oneStreamData.push(data);
            fiveStreamData.push(data);
            time_one_min = data.t;
        }
        if(data.t && timeFiveMinDiff(data.t)) {
            let value = convertToOHLC(fiveStreamData, 5);
            db_stock.query('INSERT INTO staging.interval_5m (country, code, timestamp, gmtoffset, datetime, open, close, high, low, volume) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', ['us', value.code, value.timestamp, 0, moment(value.timestamp).format('YYYY-MM-DD hh:mm'), value.open, value.close, value.high, value.low, value.volume])
            fiveStreamData = [];
            fiveStreamData.push(data)
            dailyStreamData.push(data);
            time_five_min = data;
        }
        if(data.t && timeDayDiff(data.t)) {
            db_stock.query("DELETE FROM staging.interval_1m WHERE time < $1 AND code = 'TSLA'", [moment(value.time).format('YYYY-MM-DD')])
            if(count < 5) {
                count++
            } else {
                count = 0;
                db_stock.query("DELETE FROM staging.interval_5m WHERE time < $1 AND code = 'TSLA'", [moment(value.time).format('YYYY-MM-DD')])
            }
            let value = convertToOHLC(dailyStreamData, 1440);
            db_stock.query('INSERT INTO staging.interval_1d(time, open, close, high, low, value) VALUES($1, $2, $3, $4, $5, $6)', [moment(value.time).format('YYYY-MM-DD'), value.open, value.close, value.high, value.low, value.value])
            time_one_day = data;
        }
    }                                
    ws.onclose = function(){}
}

const startFinlandApi = () => {
    setInterval(function() {
        fetchFinlandApi()
    }, 15*60*1000);
}

const fetchFinlandApi = async() => {
    var res = await axios({
        url: "https://eodhistoricaldata.com/api/real-time/AAPL.US?fmt=json&api_token=63bf6ecd8c46c5.53082791",
        method: "get",
    });
    var value = await res.json();
    db_finland.query('INSERT INTO staging.interval_1m (country, code, timestamp, gmtoffset, datetime, open, close, high, low, volume) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', ['us', value.code, value.timestamp, 0, moment(value.timestamp).format('YYYY-MM-DD hh:mm'), value.open, value.close, value.high, value.low, value.volume])
}
  
startWebsocket();
// startFinlandApi();

function timeOneMinDiff(new_time) {
    var difference = new_time - time_one_min;
    var minutesDifference = Math.floor(difference/1000/60);
    return minutesDifference == 1;
}

function timeFiveMinDiff(new_time) {
    var difference = new_time - time_five_min;
    var minutesDifference = Math.floor(difference/1000/60);
    return minutesDifference == 5;
}

function timeDayDiff(new_time) {
    var difference = new_time - time_one_day;
    var daysDifference = Math.floor(difference/1000/60/60/24);
    return daysDifference == 1;
}

const convertToOHLC = (data, interval) => {
    let open = 0;
    let close = 0;
    let high = 0;
    let low = 0;
    let timestamp = 0;
    let volume = 0;
    let code = data[0].s;

    data.sort(function(a, b) {
        return b.p - a.p
    });
    high = Number(data[0].p)

    data.sort(function(a, b) {
        return a.p - b.p
    });
    low = Number(data[0].p);
    
    data.sort(function(a, b) {
        return a.t - b.t
    });
    timestamp = data[0].t + interval * 30 * 1000;
    
    open = Number(data[0].p);
    close = Number(data[data.length - 1].p);

    data.map(o => {
        volume = volume + o.v
    })

    return { code, timestamp, open, close, high, low, volume }
  }

app.get('/interval_1m', async (req, res) => {
    let data = await db_stock.query("SELECT * FROM staging.interval_1m WHERE code = 'TSLA' AND datetime > $1 ORDER BY timestamp ASC", [moment().subtract(1, 'days')]);
    res.send(data);
});

app.get('/interval_5m', async(req, res) => {   
    let data = await db_stock.query("SELECT * FROM staging.interval_5m WHERE code = 'TSLA' AND datetime > $1 ORDER BY timestamp ASC", [moment().subtract(5, 'days')]);
    res.send(data);
});

app.get('/interval_1d', async(req, res) => {
    let data = await db_stock.query("SELECT * FROM staging.interval_1d WHERE code = 'TSLA' AND datetime > $1 ORDER BY timestamp ASC", [moment().subtract(1, 'months')]);
    res.send(data);
});

app.get('/finland_1d', async(req, res) => {
    // let data = await db_stock.query("SELECT * FROM staging.interval_1d WHERE code = 'TSLA' AND datetime > $1 ORDER BY timestamp ASC", [moment().subtract(1, 'days')]);
    // res.send(data);
});

app.get('/finland_1w', async(req, res) => {
    // let data = await db_stock.query("SELECT * FROM staging.interval_1d WHERE code = 'TSLA' AND datetime > $1 ORDER BY timestamp ASC", [moment().subtract(1, 'weeks')]);
    // res.send(data);
});

app.listen(process.env.PORT, ()=>{
    console.log(`Server started on Port ${process.env.PORT}`);
});
