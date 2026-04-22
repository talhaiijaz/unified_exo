/**
 * app.js — EEG Lab frontend
 * WebSocket consumer + Plotly EEG/FFT plots + session/control logic
 */

// ── Config ────────────────────────────────────────────────────────────

const WS_URL  = `ws://${location.host}/ws/stream`;
const API     = '/api';
const CLIENT_ID = crypto.randomUUID();

// EEG trace colors (one per channel, cycles if needed)
const COLORS = [
  '#00d4aa','#ff7f0e','#1f77b4','#e377c2','#bcbd22',
  '#17becf','#9467bd','#8c564b','#d62728','#2ca02c',
];

// ── State ─────────────────────────────────────────────────────────────

let ws = null;
let wsRetryTimer = null;
let heartbeatTimer = null;
let captureRefreshTimer = null;
let isController = false;
let lastFrameTime = 0;
let numChannels = 10;
let eegInitialized = false;
let fftInitialized = false;
let displayPaused = false;
let lastSentConfig = {};
let pendingConfig = {};
let configTimer = null;

// ── DOM refs ──────────────────────────────────────────────────────────

const elDotBoard    = document.getElementById('dot-board');
const elDotSession  = document.getElementById('dot-session');
const elBoardStatus = document.getElementById('board-status');
const elSessionInfo = document.getElementById('session-info');
const elSampleCount = document.getElementById('sample-count');
const elFps         = document.getElementById('fps');
const elController  = document.getElementById('controller-banner');
const elBtnStart    = document.getElementById('btn-start');
const elBtnStop     = document.getElementById('btn-stop');
const elBtnClaim    = document.getElementById('btn-claim');
const elBtnRelease  = document.getElementById('btn-release');
const elGain        = document.getElementById('gain');
const elGainVal     = document.getElementById('gain-val');
const elWindow      = document.getElementById('window-sec');
const elSmooth      = document.getElementById('smooth');
const elSmoothVal   = document.getElementById('smooth-val');
const elFocusCh     = document.getElementById('focus-channel');
const elNotch       = document.getElementById('notch');
const elBandpass    = document.getElementById('bandpass');
const elCaptureList = document.getElementById('capture-list');
const elToast       = document.getElementById('toast');
const elBtnPause     = document.getElementById('btn-pause');
const elDisplayLag   = document.getElementById('display-lag');
const elDisplayLagVal= document.getElementById('display-lag-val');
const elAutoScale    = document.getElementById('auto-scale');
const elShowBands    = document.getElementById('show-bands');
const elBtnScreenshot= document.getElementById('btn-screenshot');
const elCmdInput     = document.getElementById('cmd-input');
const elCmdSend      = document.getElementById('cmd-send');
const elPwmVal       = document.getElementById('pwm-val');
const elPwmSend      = document.getElementById('pwm-send');
const elRateVal      = document.getElementById('rate-val');
const elRateSend     = document.getElementById('rate-send');
const elCmdResponse  = document.getElementById('cmd-response');

// ── Toast ─────────────────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg, isError = false) {
  elToast.textContent = msg;
  elToast.className = 'visible' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { elToast.className = ''; }, 3000);
}

// ── API helpers ───────────────────────────────────────────────────────

async function apiPost(path, body = {}) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// ── Plotly EEG plot ───────────────────────────────────────────────────

const CHANNEL_SPACING = 4.0;

function initEegPlot(nCh) {
  numChannels = nCh;
  const traces = [];
  for (let i = 0; i < nCh; i++) {
    traces.push({
      x: [], y: [],
      type: 'scattergl',
      mode: 'lines',
      name: `Ch${i+1}`,
      line: { color: COLORS[i % COLORS.length], width: 1 },
      hoverinfo: 'none',
    });
  }

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#8b949e', size: 10, family: 'Courier New' },
    margin: { l: 50, r: 10, t: 28, b: 30 },
    xaxis: {
      title: 'Time (s)',
      gridcolor: '#21262d',
      zerolinecolor: '#30363d',
      color: '#8b949e',
    },
    yaxis: {
      showticklabels: false,
      gridcolor: '#21262d',
      zerolinecolor: 'transparent',
    },
    title: { text: 'Live EEG', font: { color: '#e6edf3', size: 13 } },
    showlegend: true,
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#8b949e', size: 9 },
      x: 1, xanchor: 'right', y: 1,
    },
  };

  Plotly.newPlot('plot-eeg', traces, layout, { responsive: true, displayModeBar: false });
  eegInitialized = true;
}

function initFftPlot() {
  const trace = {
    x: [], y: [],
    type: 'scattergl',
    mode: 'lines',
    fill: 'tozeroy',
    line: { color: '#ff7f0e', width: 1.5 },
    fillcolor: 'rgba(255,127,14,0.15)',
    name: 'FFT',
    hoverinfo: 'x+y',
  };

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#8b949e', size: 10, family: 'Courier New' },
    margin: { l: 50, r: 10, t: 28, b: 36 },
    xaxis: {
      title: 'Frequency (Hz)',
      range: [0, 60],
      gridcolor: '#21262d',
      color: '#8b949e',
    },
    yaxis: {
      title: 'Magnitude',
      gridcolor: '#21262d',
      color: '#8b949e',
    },
    title: { text: 'Power Spectrum', font: { color: '#e6edf3', size: 13 } },
    showlegend: false,
  };

  Plotly.newPlot('plot-fft', [trace], layout, { responsive: true, displayModeBar: false });
  fftInitialized = true;
}

function updateEegPlot(frame) {
  const offsets = Array.from({ length: frame.channels }, (_, i) => i * CHANNEL_SPACING);

  // Build one trace per channel — Plotly.react() handles adds/removes cleanly
  const traces = frame.data.map((chData, i) => ({
    x: frame.time_axis,
    y: chData.map(v => v + offsets[i]),
    type: 'scattergl',
    mode: 'lines',
    name: `Ch${i + 1}`,
    line: {
      color: frame.artifacts[i] ? '#f85149' : COLORS[i % COLORS.length],
      width: frame.artifacts[i] ? 1.8 : 1,
    },
    hoverinfo: 'none',
  }));

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#8b949e', size: 10, family: 'Courier New' },
    margin: { l: 50, r: 10, t: 28, b: 30 },
    xaxis: { title: 'Time (s)', gridcolor: '#21262d', zerolinecolor: '#30363d', color: '#8b949e' },
    yaxis: { showticklabels: false, gridcolor: '#21262d', zerolinecolor: 'transparent' },
    title: { text: 'Live EEG', font: { color: '#e6edf3', size: 13 } },
    showlegend: true,
    legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: '#8b949e', size: 9 }, x: 1, xanchor: 'right', y: 1 },
    uirevision: 'eeg',
  };

  if (!eegInitialized || frame.channels !== numChannels) {
    numChannels = frame.channels;
    Plotly.newPlot('plot-eeg', traces, layout, { responsive: true, displayModeBar: false });
    eegInitialized = true;
  } else {
    Plotly.react('plot-eeg', traces, layout, { responsive: true, displayModeBar: false });
  }
}

function updateFftPlot(frame) {
  if (!fftInitialized) initFftPlot();

  const maxMag = Math.max(...frame.fft_mags, 0.001);
  Plotly.update('plot-fft',
    { x: [frame.fft_freqs], y: [frame.fft_mags] },
    { 'yaxis.range': [0, maxMag * 1.2], title: { text: `Power Spectrum — Ch${frame.focus_channel + 1}` } },
    [0]
  );
  // Band overlays
  try {
    const show = frame.show_bands;
    if (show && frame.bands) {
      const shapes = frame.bands.map(b => ({
        type: 'rect', xref: 'x', yref: 'paper',
        x0: b.range[0], x1: b.range[1], y0: 0, y1: 1,
        fillcolor: b.color || '#666', opacity: b.alpha || 0.06, line: { width: 0 }
      }));
      Plotly.relayout('plot-fft', { shapes });
    } else {
      Plotly.relayout('plot-fft', { shapes: [] });
    }
  } catch (e) { console.error('band overlay error', e); }
}

// ── WebSocket ─────────────────────────────────────────────────────────

function connectWs() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[WS] Connected');
    updateDot(elDotBoard, 'yellow', 'Connecting…');
    clearTimeout(wsRetryTimer);
  };

  ws.onmessage = (event) => {
    let frame;
    try { frame = JSON.parse(event.data); } catch { return; }

    if (frame.type === 'status') {
      handleStatusFrame(frame);
      return;
    }

    if (frame.type === 'eeg_frame') {
      handleEegFrame(frame);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected — retry in 2s');
    updateDot(elDotBoard, 'red', 'Disconnected');
    wsRetryTimer = setTimeout(connectWs, 2000);
  };

  ws.onerror = (e) => {
    console.error('[WS] Error', e);
  };
}

function handleStatusFrame(frame) {
  if (frame.board_connected !== undefined) {
    updateDot(elDotBoard,
      frame.board_connected ? 'green' : 'red',
      frame.board_connected ? 'Board connected' : 'Board not found'
    );
  }
}

function handleEegFrame(frame) {
  // FPS counter
  const now = performance.now();
  if (lastFrameTime) {
    elFps.textContent = (1000 / (now - lastFrameTime)).toFixed(0);
  }
  lastFrameTime = now;

  // Update status UI
  elSampleCount.textContent = frame.sample_count.toLocaleString();

  const sess = frame.session;
  if (sess) {
    updateDot(elDotSession,
      sess.running ? 'green' : 'yellow',
      sess.running ? `Running · ${sess.session_id}` : 'Not running'
    );
    isController = sess.controller_id === CLIENT_ID;
    elController.style.display = isController ? 'block' : 'none';
    updateButtonState(sess);
  }

  if (frame.board_connected !== undefined) {
    updateDot(elDotBoard,
      frame.board_connected ? 'green' : 'red',
      frame.board_connected ? `Board @ ${frame.fs}Hz` : 'Board not found'
    );
  }

  // Update plots
  if (frame.data && frame.data.length > 0) {
    if (!displayPaused) updateEegPlot(frame);
    updateFftPlot(frame);
  }
}

function updateDot(dotEl, color, text) {
  dotEl.className = `dot ${color}`;
  const sibling = dotEl.nextElementSibling;
  if (sibling) sibling.textContent = text;
}

// ── Button state ──────────────────────────────────────────────────────

function updateButtonState(sess) {
  const ctrl = sess.controller_id === CLIENT_ID;
  const running = sess.running;
  const noCtrl = !sess.controller_id || sess.lock_expired;

  elBtnStart.disabled   = running || (!ctrl && !noCtrl);
  elBtnStop.disabled    = !running || !ctrl;
  elBtnClaim.disabled   = ctrl || (!noCtrl && !sess.lock_expired);
  elBtnRelease.disabled = !ctrl;
}

// ── Session / control handlers ─────────────────────────────────────────

elBtnStart.addEventListener('click', async () => {
  try {
    await apiPost('/session/start');
    showToast('Session started');
  } catch (e) { showToast(e.message, true); }
});

elBtnStop.addEventListener('click', async () => {
  try {
    await apiPost('/session/stop');
    showToast('Session stopped');
  } catch (e) { showToast(e.message, true); }
});

elBtnClaim.addEventListener('click', async () => {
  try {
    await apiPost('/session/claim');
    showToast('Controller lock claimed');
  } catch (e) { showToast(e.message, true); }
});

elBtnRelease.addEventListener('click', async () => {
  try {
    await apiPost('/session/release');
    showToast('Lock released');
  } catch (e) { showToast(e.message, true); }
});

// ── DSP controls ──────────────────────────────────────────────────────

async function pushDspConfig(patch) {
  // debounce config updates and only send changed keys
  pendingConfig = { ...pendingConfig, ...patch };
  if (configTimer) clearTimeout(configTimer);
  configTimer = setTimeout(async () => {
    const toSend = {};
    for (const k of Object.keys(pendingConfig)) {
      if (JSON.stringify(pendingConfig[k]) !== JSON.stringify(lastSentConfig[k])) {
        toSend[k] = pendingConfig[k];
      }
    }
    if (Object.keys(toSend).length === 0) { pendingConfig = {}; return; }
    try {
      await fetch(API + '/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toSend),
      });
      Object.assign(lastSentConfig, toSend);
      pendingConfig = {};
    } catch (e) { console.error('Config update failed', e); }
  }, 250);
}

elGain.addEventListener('input', () => {
  elGainVal.textContent = parseFloat(elGain.value).toFixed(1);
  pushDspConfig({ display_gain: parseFloat(elGain.value) });
});

elWindow.addEventListener('change', () => {
  pushDspConfig({ window_seconds: parseFloat(elWindow.value) });
});

elSmooth.addEventListener('input', () => {
  const ms = parseInt(elSmooth.value);
  elSmoothVal.textContent = ms;
  // Convert ms to samples at 250 Hz
  const samples = Math.max(1, Math.round(ms * 250 / 1000));
  pushDspConfig({ smoothing_samples: samples });
});

elFocusCh.addEventListener('change', () => {
  pushDspConfig({ focus_channel: parseInt(elFocusCh.value) - 1 });
});

elNotch.addEventListener('change', () => {
  pushDspConfig({ notch_enabled: elNotch.checked });
});

elBandpass.addEventListener('change', () => {
  pushDspConfig({ bandpass_enabled: elBandpass.checked });
});

// Pause / resume display (does not stop acquisition)
if (elBtnPause) {
  elBtnPause.addEventListener('click', () => {
    displayPaused = !displayPaused;
    elBtnPause.textContent = displayPaused ? 'Resume' : 'Pause';
    pushDspConfig({ display_paused: displayPaused });
    showToast(displayPaused ? 'Display paused' : 'Display resumed');
  });
}

if (elDisplayLag) {
  elDisplayLag.addEventListener('input', () => {
    const v = parseFloat(elDisplayLag.value);
    if (elDisplayLagVal) elDisplayLagVal.textContent = v.toFixed(1);
    pushDspConfig({ display_lag_seconds: v });
  });
}

if (elAutoScale) {
  elAutoScale.addEventListener('change', () => {
    pushDspConfig({ auto_scale: elAutoScale.checked });
  });
}

if (elShowBands) {
  elShowBands.addEventListener('change', () => {
    pushDspConfig({ show_bands: elShowBands.checked });
  });
}

if (elBtnScreenshot) {
  elBtnScreenshot.addEventListener('click', async () => {
    try {
      const dataUrl = await Plotly.toImage('plot-eeg', { format: 'png', height: 600, width: 1200 });
      // download locally
      const a = document.createElement('a'); a.href = dataUrl; a.download = `eeg_screenshot_${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove();
      // upload to backend
      await fetch(API + '/screenshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CLIENT_ID, png_base64: dataUrl }) });
      showToast('Screenshot saved');
    } catch (e) { showToast('Screenshot failed', true); console.error(e); }
  });
}

// Instrument control
if (elCmdSend) {
  elCmdSend.addEventListener('click', async () => {
    const cmd = (elCmdInput.value || '').trim(); if (!cmd) return;
    try {
      const res = await apiPost('/command', { command: cmd, expect_response: true, timeout: 1.5 });
      elCmdResponse.textContent = res.response || JSON.stringify(res);
    } catch (e) { elCmdResponse.textContent = e.message; }
  });
}

if (elPwmSend) {
  elPwmSend.addEventListener('click', async () => {
    const v = parseInt(elPwmVal.value || '0'); if (isNaN(v)) return showToast('Invalid PWM', true);
    try { const res = await apiPost('/command', { command: `pwm ${v}`, expect_response: true, timeout: 1.5 }); elCmdResponse.textContent = res.response || JSON.stringify(res); } catch (e) { elCmdResponse.textContent = e.message; }
  });
}

if (elRateSend) {
  elRateSend.addEventListener('click', async () => {
    const v = parseInt(elRateVal.value || '0'); if (isNaN(v)) return showToast('Invalid rate', true);
    try { const res = await apiPost('/command', { command: `rate ${v}`, expect_response: true, timeout: 1.5 }); elCmdResponse.textContent = res.response || JSON.stringify(res); } catch (e) { elCmdResponse.textContent = e.message; }
  });
}

// ── Capture controls ──────────────────────────────────────────────────

async function saveCapture(seconds) {
  try {
    const res = await fetch(API + '/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);
    showToast(data.msg);
    refreshCaptures();
  } catch (e) { showToast(e.message, true); }
}

document.getElementById('btn-cap5').addEventListener('click',  () => saveCapture(5));
document.getElementById('btn-cap30').addEventListener('click', () => saveCapture(30));
document.getElementById('btn-cap60').addEventListener('click', () => saveCapture(60));

async function refreshCaptures() {
  try {
    const files = await apiGet('/captures');
    elCaptureList.innerHTML = '';
    for (const f of files) {
      const kb = (f.size_bytes / 1024).toFixed(1);
      const div = document.createElement('div');
      div.className = 'capture-item';
      div.innerHTML = `
        <a href="${API}/captures/${f.filename}" download="${f.filename}" title="${f.filename}">
          ${f.filename}
        </a>
        <span style="color:var(--text-dim);font-size:10px">${kb}KB</span>
        <button class="del-btn" data-file="${f.filename}">✕</button>
      `;
      elCaptureList.appendChild(div);
    }
    // Wire delete buttons
    elCaptureList.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Delete ${btn.dataset.file}?`)) return;
        await fetch(`${API}/captures/${btn.dataset.file}`, { method: 'DELETE' });
        refreshCaptures();
      });
    });
  } catch (e) { console.error('capture list error', e); }
}

// ── Heartbeat ─────────────────────────────────────────────────────────

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', client_id: CLIENT_ID }));
    }
  }, 10000);
}

// ── Init ──────────────────────────────────────────────────────────────

function init() {
  initEegPlot(10);
  initFftPlot();
  connectWs();
  startHeartbeat();
  refreshCaptures();
  captureRefreshTimer = setInterval(refreshCaptures, 15000);
}

document.addEventListener('DOMContentLoaded', init);

// ── Demo mode ─────────────────────────────────────────────────────────

const elBtnDemoStart = document.getElementById('btn-demo-start');
const elBtnDemoStop  = document.getElementById('btn-demo-stop');
const elDemoStatus   = document.getElementById('demo-status');

elBtnDemoStart.addEventListener('click', async () => {
  try {
    // Auto-claim if needed
    await apiPost('/session/claim');
    const res = await apiPost('/demo/start');
    showToast('Demo mode started — synthetic EEG running');
    elBtnDemoStart.disabled = true;
    elBtnDemoStop.disabled  = false;
    if (elDemoStatus) elDemoStatus.textContent = '● Synthetic data active';
  } catch (e) { showToast(e.message, true); }
});

elBtnDemoStop.addEventListener('click', async () => {
  try {
    await apiPost('/demo/stop');
    showToast('Demo mode stopped');
    elBtnDemoStart.disabled = false;
    elBtnDemoStop.disabled  = true;
    if (elDemoStatus) elDemoStatus.textContent = '';
  } catch (e) { showToast(e.message, true); }
});
