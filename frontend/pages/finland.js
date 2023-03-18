import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";
import Head from 'next/head';
import { createChart, CrosshairMode, TickMarkType } from "lightweight-charts";
const moment = require("moment");

import styles from '../styles/Home.module.css';

export default function Stock() {

  const finlandContainerRef = useRef();
  const finlandResizeObserver = useRef();
  const [finlandData, setFinlandData] = useState([]);
  const [finlandTimeData, setFinlandTimeData] = useState(null);

  const [chart, setChart] = useState(null);
  const [lineSeries, setLineSeries] = useState(null);
  const [candleSeries, setCandleSeries] = useState(null);
  const [volumeSeries, setVolumeSeries] = useState(null);

  const [type, setType] = useState(0);
  const [range, setRange] = useState(1);
  const [load, setStatus] = useState(false);

  let start = moment().add(-3, 'months').format("YYYY-MM-DD");
  let current = moment().format("YYYY-MM-DD");
  const api_month_url = `https://eodhistoricaldata.com/api/eod/AAPL.US?from=${start}&'${current}&period=d&fmt=json&api_token=63bf6ecd8c46c5.53082791`;
  const api_url = `https://eodhistoricaldata.com/api/real-time/AAPL.US?fmt=json&api_token=63bf6ecd8c46c5.53082791`;
  const host = 'http://localhost:5000';

  useEffect(() => {
    let finland_chart = createChart(finlandContainerRef.current, {
      width: finlandContainerRef.current.clientWidth,
      height: 500, 
      layout: {
        backgroundColor: "#253248",
        textColor: "rgba(0, 0, 0, 0.8)",
        background: { type: 'solid', color: 'white' },
      },
      grid: {
        vertLines: {
          color: "#ffffff"
        },
        horzLines: {
          color: "#334158"
        }
      },
      crosshair: {
        mode: CrosshairMode.Normal
      },
      priceScale: {
        borderColor: "#485c7b"
      },
      timeScale: {
        borderColor: "#485c7b",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time, tickMarkType, locale) => {
          var date = new Date(time);
          var month = ("0" + (date.getMonth() + 1)).substr(-2);
          var day = ("0" + date.getDate()).substr(-2);
          var hour = ("0" + date.getHours()).substr(-2);
          var minutes = ("0" + date.getMinutes()).substr(-2);
  
          var d = month + "-" + day + " ";
          var t = hour + ":" + minutes;
          return d + t
        },
      },
    });
    setChart(finland_chart);

    let candleSeries = finland_chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderDownColor: "#ff4976",
      borderUpColor: "#4bffb5",
      wickDownColor: "#838ca1",
      wickUpColor: "#838ca1",
    });
    candleSeries.priceScale().applyOptions({
      scaleMargins: {
          top: 0, 
          bottom: 0.2, 
      },
    });
    setCandleSeries(candleSeries)

    let volumeSeries = finland_chart.addHistogramSeries({
      color: "#182233",
      lineWidth: 2,
      priceFormat: {
        type: "volume"
      },
      priceScaleId: '',
      overlay: true,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7, 
        bottom: 0,
      },
    });         
    setVolumeSeries(volumeSeries)                                                                                                                                                                                                                                                                                                                                                                                                                                                              
    
    let lineSeries = finland_chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    setLineSeries(lineSeries)

    const container = document.getElementById('finland-chart');
    const toolTip = document.createElement('div');
    toolTip.style = `position: absolute; left: 20px; top: 20px; display: none; padding: 10px 15px; box-sizing: border-box; font-size: 12px; text-align: left; z-index: 1000; top: 12px; left: 12px; pointer-events: none; border: 1px solid; border-radius: 2px;font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`;
    toolTip.style.background = 'white';
    toolTip.style.color = 'black';
    toolTip.style.borderColor = 'rgba( 38, 166, 154, 1)';
    container.appendChild(toolTip);

    finland_chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        toolTip.style.display = 'none';
      } else {
        const dateStr = displayTime(param.time);
        toolTip.style.display = 'block';
        const data = param.seriesData.get(candleSeries);
        const volume = param.seriesData.get(volumeSeries);
        if(data != undefined && volume != undefined) {
          toolTip.innerHTML = `
            <div style="color: ${'rgba( 38, 166, 154, 1)'}">ABC Inc.</div>
            <div style="font-size: 14px; text-align: center; margin: 4px 0px; color: ${'black'}">
              Volume:&nbsp; ${volume.value/1000000}M
            </div>
            <div style="font-size: 14px; margin: 4px 0px; color: ${'black'}">
              Open:&nbsp; ${data.open}
            </div>
            <div style="font-size: 14px; margin: 4px 0px; color: ${'black'}">
              High:&nbsp; ${data.high}
            </div>
            <div style="font-size: 14px; margin: 4px 0px; color: ${'black'}">
              Low:&nbsp; ${data.low}
            </div>
            <div style="font-size: 14px; margin: 4px 0px; color: ${'black'}">
              Close:&nbsp; ${data.close}
            </div>
            <div style="color: ${'black'}; text-align: right">
              ${dateStr}
            </div>`;
        }
      }
    });
  }, []);
  
  useEffect(() => {
    if(finlandData.length > 0 && chart) {
      candleSeries.setData(finlandData);
      lineSeries.setData(convertToLineData(finlandData));
      volumeSeries.setData(finlandData);
      finlandResizeObserver.current = new ResizeObserver(entries => {
        const { width } = entries[0].contentRect;
        chart.applyOptions({ width, height: 500 });
        setTimeout(() => {
          chart.timeScale().fitContent();
        }, 0);
      });
      finlandResizeObserver.current.observe(finlandContainerRef.current);
      return () => finlandResizeObserver.current.disconnect();
    }
  }, [finlandData, chart]);

  useEffect(() => {
    if(finlandTimeData) {
      candleSeries.update(finlandTimeData);
      lineSeries.update(convertToTimeLineData(finlandTimeData));
      volumeSeries.update(finlandTimeData);
    }
  }, [finlandTimeData]);

  useEffect(() => {
    if(candleSeries && lineSeries) {
      if(type == '0') {
        candleSeries.applyOptions({
          visible: true
        })
        lineSeries.applyOptions({
          visible: false
        })
      } else {
        candleSeries.applyOptions({
          visible: false
        })
        lineSeries.applyOptions({
          visible: true
        })
      }
    }
  }, [type, candleSeries, lineSeries ])

  useEffect(() => {
    fetchFinlands();
    setInterval(function(){
      fetchTimeFinland();
    }, 15 * 60 * 1000); 
    if(range == 3) {
      chart.applyOptions({
        timeScale: {
          timeVisible: false,
          secondsVisible: false,
        }
      })
    }
  }, [range])

  const fetchFinlands = async () => {
    try {
      switch (range) {
        case 1:
          load && removeLoading()
          loading();
          var res = await axios.get(`${host}/finland_1d`);
          if(res.status == 200) {
            setFinlandData(res.data.rows ? convertToFinlandData(res.data.rows) : []);
            removeLoading()
          }
          break;
        case 2:
          load && removeLoading()
          loading();
          var res = await axios.get(`${host}/finland_1w`);
          if(res.status == 200) {
            setFinlandData(res.data.rows ? convertToFinlandData(res.data.rows) : []);
            removeLoading()
          }
          break;
        case 3:
          load && removeLoading()
          loading();
          var res = await fetch(api_month_url);
          if(res.status == 200) {
            var data = await res.json();
            setFinlandData(convertToFinlandData(data));
            removeLoading()
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTimeFinland = async () => {
    try {
      const response = await fetch(api_url);
      const data = await response.json();
      setFinlandTimeData(convertToFinlandTimeData(data));
    } catch (error) {
      console.log(error);
    }
  }

  const setDownload = (e) => {
    if(e.target.value == "excel") {
      const fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
      const ws = XLSX.utils.json_to_sheet(finlandData);
      const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: fileType });
      FileSaver.saveAs(data, 'ticker.xlsx');
    }
    if(e.target.value == "csv") {
      if(finlandData.length > 1) {
        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(function(rowArray) {
            let row = rowArray.join(",");
            csvContent += row + "\r\n";
        });
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ticker.csv");
        document.body.appendChild(link);
        link.click();
      }
    }
  }

  const setChartType = (e) => {
    setType(e.target.value);
  }

  const showMax = (e) => {
    e.preventDefault();
    var max, index;
    for (var i=0 ; i<finlandData.length ; i++) {
        if (max == null || parseFloat(finlandData[i].high) > parseFloat(max.high)) {
          max = finlandData[i]; index = finlandData.length-i
        }
    }
    chart.timeScale().scrollToPosition(-index, true);
  }

  const convertToFinlandData = (data) => {
    return data.map(o=>{
      return {
        time: o.date,
        open: o.open,
        high: o.high,
        low: o.low,
        close: o.close,
        value: o.volume,
        color: o.open > o.close ? "#ef5350" : "#26a69a"
      } 
    })
  }

  const convertToFinlandTimeData = (data) => {
    return {
      time: data.timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      value: data.volume,
      color: data.open > data.close ? "#ef5350" : "#26a69a"
    } 
  }

  const convertToLineData = (data) => {
    return data.map(o=> {
      return {
        time: o.time,
        value: (o.open + o.close)/2
      }
    })
  }

  const convertToTimeLineData = (data) => {
    return {
      time: data.time,
      value: (data.open + data.close)/2
    }
  }

  const displayTime = (time) => {
    var str = "";

    var currentTime = new Date(time)
    var hours = currentTime.getHours()
    var minutes = currentTime.getMinutes()
    var seconds = currentTime.getSeconds()

    if (minutes < 10) {
        minutes = "0" + minutes
    }
    if (seconds < 10) {
        seconds = "0" + seconds
    }
    str += hours + ":" + minutes + ":" + seconds + " ";
    if(hours > 11){
        str += "PM"
    } else {
        str += "AM"
    }
    return str;
  }

  const loading = () => {
    const container = document.getElementById('finland-chart');
    const loading = document.createElement('img');
    loading.setAttribute('src', '/loading.gif');
    loading.style = `position: absolute; top: 30%; left: 30%; z-index: 1000`;
    loading.setAttribute('id', 'loading')
    container.appendChild(loading);
    setStatus(true);
  }

  const removeLoading = () => {
    const container = document.getElementById('finland-chart');
    const loading = document.getElementById('loading');
    container.removeChild(loading);
    setStatus(false);
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>lightweight chart</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.header}>
        <div className={styles.flex}>
          <span className={styles.btn} onClick={(e) => { e.preventDefault(); setRange(1) }}>1 Day</span>
          <span className={styles.btn} onClick={(e) => { e.preventDefault(); setRange(2) }}>1 Week</span>
          <span className={styles.btn} onClick={(e) => { e.preventDefault(); setRange(3) }}>3 Month</span>
          <span className={styles.btn} onClick={ showMax }>Max</span>
        </div>
        <div className={styles.flex}>
          <select className={styles.selection} onClick={setChartType}>
            <option value="0">Candles</option>
            <option value="1">Line</option>
          </select>
          <select className={styles.selection} onChange={setDownload}>
            <option value="excel">Export to Excel</option>
            <option value="csv">Export to CSV</option>
          </select>
        </div>
      </div>
      <div
        id="finland-chart"
        ref={finlandContainerRef}
      />
    </div>
  )
}
