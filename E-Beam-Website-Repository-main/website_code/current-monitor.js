const CHANNEL_COUNT = 18;
const CHANNEL_NAMES = Array.from({ length: CHANNEL_COUNT }, (_, i) => `CH${i + 1}`);
const BLUE = '#1890ff';
const GRID = 'rgba(255,255,255,0.08)';

const store = {
  time_s: [],
  channels: Array.from({ length: CHANNEL_COUNT }, () => []),
  startedAtISO: null,
  lastTimestampS: null,
  firstIncomingTimestamp: null,
  inferredInputUnit: null,
};
window.currentMeasurementStore = store;

const ui = {};
const charts = [];
let demoTimer = null;
let serialPort = null;
let serialReader = null;
let serialKeepReading = false;
let refreshPending = false;
let streamSource = 'Disconnected';
let browserTimeStart = null;

function $(id){ return document.getElementById(id); }

function logStatus(message){
  const box = ui.streamStatus;
  if (!box) return;
  const stamp = new Date().toLocaleTimeString();
  box.textContent = `[${stamp}] ${message}\n` + box.textContent;
}

function setConnectionBadge(text, connected = false){
  ui.connectionBadge.textContent = text;
  ui.connectionBadge.classList.toggle('is-connected', connected);
}

function clamp(value, min, max){
  return Math.min(max, Math.max(min, value));
}

function ensureStartMetadata(){
  if (!store.startedAtISO) {
    store.startedAtISO = new Date().toISOString();
    browserTimeStart = performance.now();
  }
}

function normalizeTime(raw){
  ensureStartMetadata();

  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return (performance.now() - browserTimeStart) / 1000;
  }

  if (store.firstIncomingTimestamp === null) {
    store.firstIncomingTimestamp = raw;

    if (Math.abs(raw) > 1e5) store.inferredInputUnit = 'ms';
    else store.inferredInputUnit = 's';
  }

  let delta = raw - store.firstIncomingTimestamp;
  if (store.inferredInputUnit === 'ms') delta /= 1000;
  return Math.max(0, delta);
}

function addSample(rawTime, values){
  if (!Array.isArray(values) || values.length < CHANNEL_COUNT) return;

  const t = normalizeTime(rawTime);
  store.time_s.push(t);
  for (let i = 0; i < CHANNEL_COUNT; i += 1) {
    store.channels[i].push(Number(values[i]));
  }
  store.lastTimestampS = t;
  scheduleRefresh();
}

function parseNumericTokens(text){
  return text
    .split(/[\s,;]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter(value => Number.isFinite(value));
}

function parseIncomingLine(line){
  const text = line.trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    const channels = parsed.channels || parsed.currents || parsed.values || parsed.data;
    const timestamp = parsed.timestamp ?? parsed.time ?? parsed.t ?? null;
    if (Array.isArray(channels) && channels.length >= CHANNEL_COUNT) {
      return { time: Number(timestamp), values: channels.slice(0, CHANNEL_COUNT).map(Number) };
    }
  } catch (_err) {
    // fall through to CSV/plain parsing
  }

  const numeric = parseNumericTokens(text);
  if (numeric.length >= CHANNEL_COUNT + 1) {
    return { time: numeric[0], values: numeric.slice(1, CHANNEL_COUNT + 1) };
  }
  if (numeric.length >= CHANNEL_COUNT) {
    return { time: null, values: numeric.slice(0, CHANNEL_COUNT) };
  }
  return null;
}

function latestValue(index){
  const arr = store.channels[index];
  return arr.length ? arr[arr.length - 1] : null;
}

function visiblePoints(){
  return clamp(Number(ui.maxVisiblePoints.value) || 600, 100, 5000);
}

function currentUnit(){
  return (ui.unitsLabel.value || 'nA').trim() || 'nA';
}

function buildCharts(){
  const grid = ui.chartsGrid;
  grid.innerHTML = '';

  CHANNEL_NAMES.forEach((name, index) => {
    const card = document.createElement('article');
    card.className = 'current-chart-card';
    card.innerHTML = `
      <div class="current-chart-head">
        <h3>${name}</h3>
        <div class="current-latest" id="latest_${index}">—</div>
      </div>
      <div class="current-chart-canvas-wrap">
        <canvas id="chart_${index}"></canvas>
      </div>
    `;
    grid.appendChild(card);

    const ctx = card.querySelector('canvas').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: name,
          data: [],
          borderColor: BLUE,
          borderWidth: 1.75,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.15,
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        normalized: true,
        parsing: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context){
                return `${context.parsed.y.toFixed(3)} ${currentUnit()}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Time (s)', color: '#c7d3f3' },
            ticks: { color: '#c7d3f3', maxTicksLimit: 5 },
            grid: { color: GRID },
          },
          y: {
            title: { display: true, text: `Current (${currentUnit()})`, color: '#c7d3f3' },
            ticks: { color: '#c7d3f3', maxTicksLimit: 4 },
            grid: { color: GRID },
          }
        }
      }
    });

    charts.push(chart);
  });
}

function refreshCharts(){
  refreshPending = false;
  const times = store.time_s;
  const pointCount = visiblePoints();
  const start = Math.max(0, times.length - pointCount);
  const slicedTimes = times.slice(start);

  charts.forEach((chart, index) => {
    const values = store.channels[index].slice(start);
    chart.data.datasets[0].data = slicedTimes.map((t, i) => ({ x: t, y: values[i] }));
    chart.options.scales.y.title.text = `Current (${currentUnit()})`;
    chart.update('none');

    const latest = latestValue(index);
    const latestEl = $(`latest_${index}`);
    latestEl.textContent = latest === null ? '—' : `${latest.toFixed(3)} ${currentUnit()}`;
  });

  ui.totalSamples.textContent = String(times.length);
  ui.storedDuration.textContent = times.length ? `${times[times.length - 1].toFixed(2)} s` : '0.00 s';
  ui.latestTimestamp.textContent = times.length ? `${times[times.length - 1].toFixed(3)} s` : '—';
}

function scheduleRefresh(){
  if (refreshPending) return;
  refreshPending = true;
  requestAnimationFrame(refreshCharts);
}

function downloadText(filename, content, mimeType){
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function selectedRangeIndices(startTime, endTime){
  const times = store.time_s;
  const end = Number.isFinite(endTime) ? endTime : Infinity;
  const start = Number.isFinite(startTime) ? startTime : -Infinity;
  const indices = [];
  for (let i = 0; i < times.length; i += 1) {
    if (times[i] >= start && times[i] <= end) indices.push(i);
  }
  return indices;
}

function exportRange(asAll = false){
  if (!store.time_s.length) {
    logStatus('No data available to export yet.');
    return;
  }

  const startTime = asAll ? Number.NEGATIVE_INFINITY : Number(ui.exportStart.value);
  const endTime = asAll ? Number.POSITIVE_INFINITY : Number(ui.exportEnd.value);
  const indices = selectedRangeIndices(startTime, endTime);

  if (!indices.length) {
    logStatus('No samples found inside the requested time range.');
    return;
  }

  const times = indices.map(i => store.time_s[i]);
  const channelArrays = store.channels.map(channel => indices.map(i => channel[i]));
  const prefix = (ui.filenamePrefix.value || 'current_measurements').trim() || 'current_measurements';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const format = ui.exportFormat.value;

  if (format === 'csv') {
    const header = ['time_s', ...CHANNEL_NAMES].join(',');
    const rows = times.map((t, rowIndex) => {
      const values = channelArrays.map(arr => arr[rowIndex]);
      return [t, ...values].join(',');
    });
    downloadText(`${prefix}_${stamp}.csv`, [header, ...rows].join('\n'), 'text/csv;charset=utf-8');
  } else {
    const payload = {
      exported_at: new Date().toISOString(),
      source: streamSource,
      units: currentUnit(),
      range_s: {
        start: times[0],
        end: times[times.length - 1],
      },
      time_s: times,
      channels: CHANNEL_NAMES,
      current_arrays: channelArrays,
    };
    downloadText(`${prefix}_${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  ui.lastExport.textContent = `${indices.length} samples`;
  logStatus(`Exported ${indices.length} samples as ${format.toUpperCase()}.`);
}

function clearData(){
  store.time_s = [];
  store.channels = Array.from({ length: CHANNEL_COUNT }, () => []);
  store.startedAtISO = null;
  store.lastTimestampS = null;
  store.firstIncomingTimestamp = null;
  store.inferredInputUnit = null;
  browserTimeStart = null;
  refreshCharts();
  logStatus('Cleared stored arrays.');
}

function startDemo(){
  stopDemo();
  streamSource = 'Demo stream';
  setConnectionBadge('Demo stream', true);
  logStatus('Demo stream started.');

  demoTimer = setInterval(() => {
    const t = store.time_s.length ? store.time_s[store.time_s.length - 1] + 0.1 : 0;
    const values = Array.from({ length: CHANNEL_COUNT }, (_, idx) => {
      const base = 15 + idx * 0.8;
      const wave = Math.sin(t * (0.45 + idx * 0.015) + idx * 0.35) * (2.2 + idx * 0.05);
      const ripple = Math.cos(t * (1.1 + idx * 0.03)) * 0.4;
      const noise = (Math.random() - 0.5) * 0.45;
      return base + wave + ripple + noise;
    });
    addSample(t, values);
  }, 100);
}

function stopDemo(){
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
    logStatus('Demo stream stopped.');
  }
  if (!serialPort) {
    streamSource = 'Disconnected';
    setConnectionBadge('Disconnected', false);
  }
}

async function disconnectSerial(){
  serialKeepReading = false;
  if (serialReader) {
    try { await serialReader.cancel(); } catch (_err) {}
    try { serialReader.releaseLock(); } catch (_err) {}
    serialReader = null;
  }
  if (serialPort) {
    try { await serialPort.close(); } catch (_err) {}
    serialPort = null;
  }
  streamSource = 'Disconnected';
  setConnectionBadge('Disconnected', false);
  logStatus('Serial connection closed.');
}

async function connectSerial(){
  if (!('serial' in navigator)) {
    logStatus('Web Serial is not available in this browser. Use Chrome or Edge for direct board streaming.');
    return;
  }

  stopDemo();

  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });
    const decoder = new TextDecoderStream();
    serialPort.readable.pipeTo(decoder.writable).catch(() => {});
    serialReader = decoder.readable.getReader();
    serialKeepReading = true;
    streamSource = 'USB serial';
    setConnectionBadge('USB serial connected', true);
    logStatus('Serial port connected at 115200 baud.');

    let buffer = '';
    while (serialKeepReading) {
      const { value, done } = await serialReader.read();
      if (done) break;
      if (!value) continue;

      buffer += value;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const parsed = parseIncomingLine(line);
        if (!parsed) continue;
        addSample(parsed.time, parsed.values);
      }
    }
  } catch (error) {
    logStatus(`Serial error: ${error.message}`);
  } finally {
    await disconnectSerial();
  }
}

function wireEvents(){
  ui.connectSerialBtn.addEventListener('click', connectSerial);
  ui.disconnectSerialBtn.addEventListener('click', disconnectSerial);
  ui.startDemoBtn.addEventListener('click', startDemo);
  ui.stopDemoBtn.addEventListener('click', stopDemo);
  ui.clearDataBtn.addEventListener('click', clearData);
  ui.exportSelectionBtn.addEventListener('click', () => exportRange(false));
  ui.exportAllBtn.addEventListener('click', () => exportRange(true));
  ui.maxVisiblePoints.addEventListener('change', scheduleRefresh);
  ui.unitsLabel.addEventListener('input', scheduleRefresh);
}

function init(){
  ui.connectionBadge = $('connectionBadge');
  ui.streamStatus = $('streamStatus');
  ui.maxVisiblePoints = $('maxVisiblePoints');
  ui.unitsLabel = $('unitsLabel');
  ui.exportStart = $('exportStart');
  ui.exportEnd = $('exportEnd');
  ui.exportFormat = $('exportFormat');
  ui.filenamePrefix = $('filenamePrefix');
  ui.connectSerialBtn = $('connectSerialBtn');
  ui.disconnectSerialBtn = $('disconnectSerialBtn');
  ui.startDemoBtn = $('startDemoBtn');
  ui.stopDemoBtn = $('stopDemoBtn');
  ui.clearDataBtn = $('clearDataBtn');
  ui.exportSelectionBtn = $('exportSelectionBtn');
  ui.exportAllBtn = $('exportAllBtn');
  ui.totalSamples = $('totalSamples');
  ui.storedDuration = $('storedDuration');
  ui.latestTimestamp = $('latestTimestamp');
  ui.lastExport = $('lastExport');
  ui.chartsGrid = $('chartsGrid');

  buildCharts();
  wireEvents();
  setConnectionBadge('Disconnected', false);
  logStatus('18-channel monitor ready. Start demo mode or connect the board.');
  refreshCharts();
}

document.addEventListener('DOMContentLoaded', init);
