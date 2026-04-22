
const schema = [
  {
    title: "Voltages",
    key: "voltages",
    open: true,
    fields: [
      { key: "V_CNT", label: "Cathode voltage magnitude", type: "number", step: "any", min: 0, unit: "V", help: "The CNT substrate and forest conductor are held at -V_CNT." },
      { key: "V_MID", label: "Middle electrode voltage", type: "number", step: "any", unit: "V", help: "The outer electrodes remain grounded while the middle electrode is biased to V_MID." },
    ],
  },
  {
    title: "Lens geometry",
    key: "geometry",
    open: true,
    fields: [
      { key: "a_inner", label: "Inner aperture radius", type: "number", step: "any", min: 0, unit: "m", help: "Inner radius of each ring electrode aperture." },
      { key: "r_stack_outer", label: "Outer stack radius", type: "number", step: "any", min: 0, unit: "m", help: "Physical outer radius of the conductor + dielectric stack." },
      { key: "t_e", label: "Electrode thickness", type: "number", step: "any", min: 0, unit: "m", help: "Thickness of each ring electrode in the axial direction." },
      { key: "edge_radius", label: "Electrode edge radius", type: "number", step: "any", min: 0, unit: "m", help: "Rounded-corner radius used in the 2D cross-section." },
      { key: "d1", label: "Cathode to E1 spacing", type: "number", step: "any", min: 0, unit: "m", help: "Extractor gap between the cathode plane and the first electrode." },
      { key: "d2", label: "E1 to E2 spacing", type: "number", step: "any", min: 0, unit: "m", help: "Gap between the first and second electrodes." },
      { key: "d3", label: "E2 to E3 spacing", type: "number", step: "any", min: 0, unit: "m", help: "Gap between the second and third electrodes." },
    ],
  },
  {
    title: "Dielectric + computational domain",
    key: "dielectricDomain",
    open: false,
    fields: [
      { section: "dielectric", key: "eps_r_oxide", label: "Oxide relative permittivity", type: "number", step: "any", min: 0, unit: "—", help: "Relative permittivity for the annular support region." },
      { section: "dielectric", key: "fill_stack_with_oxide", label: "Include explicit oxide support", type: "checkbox", help: "When enabled, the annulus outside the aperture is filled with dielectric up to the last electrode." },
      { section: "domain", key: "R_outer", label: "Radial truncation", type: "number", step: "any", min: 0, unit: "m", help: "Outer radial boundary of the solve domain." },
      { section: "domain", key: "z_extra", label: "Downstream extra length", type: "number", step: "any", min: 0, unit: "m", help: "Extra solved distance beyond the last electrode." },
    ],
  },
  {
    title: "Emitter + source model",
    key: "emitter",
    open: false,
    fields: [
      { section: "emitter", key: "R_forest", label: "Forest radius", type: "number", step: "any", min: 0, unit: "m", help: "Macro-emitter radius of the CNT forest." },
      { section: "emitter", key: "h_forest", label: "Forest height", type: "number", step: "any", min: 0, unit: "m", help: "Axial height of the emitting forest above the cathode plane." },
      { section: "emitter", key: "forest_edge_radius", label: "Forest edge radius", type: "number", step: "any", min: 0, unit: "m", help: "Rounded corner at the outer canopy edge." },
      { section: "emitter", key: "emission_edge_exclusion", label: "Emission edge exclusion", type: "number", step: "any", min: 0, unit: "m", help: "Launches are excluded near the forest rim to avoid fringe-dominated edge starts." },
      { section: "emission", key: "work_function_eV", label: "Work function", type: "number", step: "any", min: 0, unit: "eV", help: "Effective work function used in the FN-like emission proxy." },
      { section: "emission", key: "beta_forest_eff", label: "Effective field enhancement", type: "number", step: "any", min: 0, unit: "—", help: "Macro-to-effective field scaling for the canopy emission proxy." },
      { section: "emission", key: "tip_areal_density", label: "Active tip areal density", type: "number", step: "any", min: 0, unit: "m⁻²", help: "Effective number of emitting tips per unit canopy area." },
      { section: "emission", key: "tip_apex_radius", label: "Effective tip apex radius", type: "number", step: "any", min: 0, unit: "m", help: "Used only in the coarse forest-level current proxy." },
    ],
  },
  {
    title: "Grid resolution",
    key: "grid",
    open: false,
    fields: [
      { section: "grid", key: "Nr", label: "Radial grid points", type: "number", step: 1, min: 21, unit: "cells", help: "Publication-style grids are slower; this page defaults to a more interactive mesh." },
      { section: "grid", key: "Nz", label: "Axial grid points", type: "number", step: 1, min: 41, unit: "cells", help: "Increase with caution: the sparse solve cost grows quickly." },
    ],
  },
  {
    title: "Trajectory tracing",
    key: "trace",
    open: false,
    fields: [
      { section: "trace", key: "mode", label: "Launch mode", type: "select", options: [
        { value: "emission_all_faces", label: "Emission all faces" },
        { value: "emission_quantiles", label: "Emission quantiles" },
        { value: "uniform_radius", label: "Uniform radius" },
      ], help: "Choose whether to preserve explicit face weights or sample a simpler source." },
      { section: "trace", key: "n_rays", label: "Uniform/quantile ray count", type: "number", step: 1, min: 3, unit: "rays", help: "Used directly in the uniform-radius and emission-quantile modes." },
      { section: "trace", key: "n_subrays_per_face", label: "Sub-rays per face", type: "number", step: 1, min: 1, unit: "rays/face", help: "Used in emission_all_faces mode." },
      { section: "trace", key: "initial_energy_eV", label: "Mean launch energy", type: "number", step: "any", min: 0, unit: "eV", help: "Mean of the launch energy distribution." },
      { section: "trace", key: "z_offset", label: "Launch offset above canopy", type: "number", step: "any", min: 0, unit: "m", help: "Effective starting height above the emitting canopy." },
      { section: "trace", key: "symmetric", label: "Duplicate mirrored launches", type: "checkbox", help: "Mirrors the launch bundle itself. The plot is still reflected even if this is off." },
      { section: "trace", key: "angle_mode", label: "Angle mode", type: "select", options: [
        { value: "gaussian", label: "Truncated Gaussian" },
        { value: "delta", label: "Single angle" },
      ], help: "Angular spread model around the local surface normal." },
      { section: "trace", key: "angle_sigma_deg", label: "Angular sigma", type: "number", step: "any", min: 0, unit: "deg", help: "Standard deviation for the truncated Gaussian angle model." },
      { section: "trace", key: "angle_max_deg", label: "Angular cap", type: "number", step: "any", min: 0, unit: "deg", help: "Hard cutoff for the Gaussian launch angle model." },
      { section: "trace", key: "launch_half_angle_deg", label: "Delta launch angle", type: "number", step: "any", min: 0, unit: "deg", help: "Used only when the angle mode is delta." },
      { section: "trace", key: "energy_mode", label: "Energy mode", type: "select", options: [
        { value: "gaussian", label: "Truncated Gaussian" },
        { value: "delta", label: "Single energy" },
      ], help: "Energy spread model for the injected beam." },
      { section: "trace", key: "energy_sigma_eV", label: "Energy sigma", type: "number", step: "any", min: 0, unit: "eV", help: "Standard deviation for the Gaussian launch energy model." },
      { section: "trace", key: "energy_min_eV", label: "Minimum launch energy", type: "number", step: "any", min: 0, unit: "eV", help: "Lower truncation applied to the Gaussian energy model." },
      { section: "trace", key: "rng_seed", label: "Random seed", type: "number", step: 1, unit: "seed", help: "Makes stochastic bundles reproducible." },
      { section: "trace", key: "t_max", label: "Maximum trace time", type: "number", step: "any", min: 0, unit: "s", help: "Upper bound for the ODE integration interval." },
      { section: "trace", key: "max_step", label: "Maximum ODE step", type: "number", step: "any", min: 0, unit: "s", help: "Smaller values improve event localization but increase cost." },
      { section: "trace", key: "rtol", label: "Relative tolerance", type: "number", step: "any", min: 0, unit: "—", help: "Relative tolerance passed to DOP853." },
      { section: "trace", key: "atol_xz", label: "Position absolute tolerance", type: "number", step: "any", min: 0, unit: "m", help: "Absolute tolerance for x and z." },
      { section: "trace", key: "atol_p", label: "Momentum absolute tolerance", type: "number", step: "any", min: 0, unit: "kg·m/s", help: "Absolute tolerance for p_x and p_z." },
      { section: "trace", key: "max_plot_points_per_ray", label: "Plot points per ray", type: "number", step: 1, min: 20, unit: "samples", help: "Decimation limit for browser plotting only; diagnostics still use the full solve." },
    ],
  },
];

const worker = new Worker("py_worker.js");
let requestId = 0;
const pending = new Map();
let defaultConfig = null;
let latestField = null;
let latestTrace = null;

const els = {
  formSections: document.getElementById("formSections"),
  restoreDefaultsBtn: document.getElementById("restoreDefaultsBtn"),
  solveFieldBtn: document.getElementById("solveFieldBtn"),
  solveTraceBtn: document.getElementById("solveTraceBtn"),
  traceOnlyBtn: document.getElementById("traceOnlyBtn"),
  copyConfigBtn: document.getElementById("copyConfigBtn"),
  statusLog: document.getElementById("statusLog"),
  runtimeBadge: document.getElementById("runtimeBadge"),
  summaryCards: document.getElementById("summaryCards"),
  resolutionTableBody: document.querySelector("#resolutionTable tbody"),
};

worker.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg.type === "log") {
    log(msg.message);
    if (msg.status) updateRuntimeBadge(msg.status, msg.message);
    return;
  }
  if (msg.type === "response") {
    const record = pending.get(msg.id);
    if (!record) return;
    pending.delete(msg.id);
    if (msg.ok) record.resolve(msg.data);
    else record.reject(new Error(msg.error || "Worker error"));
  }
});

function callWorker(action, payload = {}) {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, action, payload });
  });
}

function log(message) {
  const stamp = new Date().toLocaleTimeString();
  els.statusLog.textContent = `[${stamp}] ${message}\n` + els.statusLog.textContent;
}

function updateRuntimeBadge(kind, text) {
  const badge = els.runtimeBadge;
  badge.classList.remove("ready", "busy", "error");
  if (kind === "ready") badge.classList.add("ready");
  if (kind === "busy") badge.classList.add("busy");
  if (kind === "error") badge.classList.add("error");
  badge.textContent = text;
}

function setBusy(isBusy) {
  [els.restoreDefaultsBtn, els.solveFieldBtn, els.solveTraceBtn, els.traceOnlyBtn, els.copyConfigBtn].forEach(btn => {
    btn.disabled = isBusy;
  });
  updateRuntimeBadge(isBusy ? "busy" : "ready", isBusy ? "Worker is running…" : "Runtime ready");
}

function makeFieldId(section, key) {
  return `${section}.${key}`;
}

function renderForm(config) {
  els.formSections.innerHTML = "";
  schema.forEach(section => {
    const wrapper = document.createElement("section");
    wrapper.className = "form-section";

    const headerBtn = document.createElement("button");
    headerBtn.type = "button";
    headerBtn.innerHTML = `<span>${section.title}</span><span>${section.open ? "−" : "+"}</span>`;
    const content = document.createElement("div");
    content.className = "section-content";
    content.style.display = section.open ? "grid" : "none";

    headerBtn.addEventListener("click", () => {
      const open = content.style.display !== "none";
      content.style.display = open ? "none" : "grid";
      headerBtn.querySelector("span:last-child").textContent = open ? "+" : "−";
    });

    section.fields.forEach(field => {
      const block = document.createElement("div");
      block.className = "field";
      const fieldSection = field.section || section.key;
      const value = config?.[fieldSection]?.[field.key];
      const id = makeFieldId(fieldSection, field.key);

      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = field.label;
      block.appendChild(label);

      const row = document.createElement("div");
      row.className = "field-row";

      let input;
      if (field.type === "select") {
        input = document.createElement("select");
        field.options.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          if (String(value) === String(opt.value)) option.selected = true;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = field.type === "checkbox" ? "checkbox" : (field.type || "number");
        if (field.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = value ?? "";
          if (field.step !== undefined) input.step = field.step;
          if (field.min !== undefined) input.min = field.min;
          if (field.max !== undefined) input.max = field.max;
        }
      }
      input.id = id;
      input.dataset.section = fieldSection;
      input.dataset.key = field.key;
      input.dataset.kind = field.type;
      row.appendChild(input);

      if (field.unit) {
        const unit = document.createElement("span");
        unit.className = "unit";
        unit.textContent = field.unit;
        row.appendChild(unit);
      }

      block.appendChild(row);

      const help = document.createElement("div");
      help.className = "field-help";
      help.textContent = field.help;
      block.appendChild(help);

      content.appendChild(block);
    });

    wrapper.appendChild(headerBtn);
    wrapper.appendChild(content);
    els.formSections.appendChild(wrapper);
  });
}

function collectConfig() {
  const config = structuredClone(defaultConfig || {});
  document.querySelectorAll("[data-section][data-key]").forEach(input => {
    const section = input.dataset.section;
    const key = input.dataset.key;
    if (!config[section]) config[section] = {};
    if (input.dataset.kind === "checkbox") {
      config[section][key] = input.checked;
    } else if (input.type === "number") {
      const raw = input.value.trim();
      config[section][key] = raw === "" ? null : Number(raw);
    } else {
      config[section][key] = input.value;
    }
  });
  return config;
}

function applyConfigToForm(config) {
  document.querySelectorAll("[data-section][data-key]").forEach(input => {
    const section = input.dataset.section;
    const key = input.dataset.key;
    const value = config?.[section]?.[key];
    if (input.dataset.kind === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value ?? "";
    }
  });
}

function renderSummaryCards(field, trace) {
  const cards = [];
  if (field) {
    const obs = field.observables || {};
    cards.push(
      { label: "Direct solve", value: formatSeconds(field.solve_time_s), note: "Sparse direct electrostatic solve" },
      { label: "Axis peak potential", value: formatKV(obs.axisV_peak_V), note: `z = ${formatMm(obs.z_axisV_peak_m)}` },
      { label: "Mean canopy field", value: formatScientific(obs.forest_macroF_mean_Vm), note: "V/m" },
      { label: "FN current proxy", value: formatScientific(obs.I_FN_total_A), note: "A (effective proxy)" },
    );
  }
  if (trace?.summary) {
    const sum = trace.summary;
    cards.push(
      { label: "Top-exit transmission", value: formatFraction(sum.weight_top_exit_frac), note: "weight-based" },
      { label: "In-domain spot", value: formatUm(sum.in_domain_rms_x), note: sum.in_domain_z ? `z = ${formatMm(sum.in_domain_z)}` : "transmitted rays" },
      { label: "Asymptotic focus", value: sum.z_focus_asym ? formatMm(sum.z_focus_asym) : "—", note: "exit-slope estimate" },
      { label: "Max energy drift", value: formatScientific(sum.max_energy_drift), note: "relative" },
    );
  }

  els.summaryCards.innerHTML = "";
  cards.forEach(card => {
    const article = document.createElement("article");
    article.className = "card metric-card";
    article.innerHTML = `
      <div class="metric-label">${card.label}</div>
      <div class="metric-value">${card.value}</div>
      <div class="metric-note">${card.note || ""}</div>
    `;
    els.summaryCards.appendChild(article);
  });
}

function renderResolutionTable(field) {
  els.resolutionTableBody.innerHTML = "";
  const rows = field?.resolution || [];
  rows.forEach(row => {
    const tr = document.createElement("tr");
    const verdictClass = row.verdict === "okay" ? "verdict-okay" : row.verdict === "coarse" ? "verdict-coarse" : "verdict-under-resolved";
    tr.innerHTML = `
      <td>${row.feature}</td>
      <td>${row.cells_across_feature == null ? "—" : row.cells_across_feature.toFixed(2)}</td>
      <td class="${verdictClass}">${row.verdict}</td>
    `;
    els.resolutionTableBody.appendChild(tr);
  });
}

function showWarnings(warnings = [], errors = []) {
  if (!warnings.length && !errors.length) return;
  log((errors.length ? "Errors: " + errors.join(" | ") + ". " : "") + (warnings.length ? "Warnings: " + warnings.join(" | ") : ""));
}

function renderFieldPlots(field) {
  if (!field) return;
  const { maps, conductors, axis_profiles } = field;
  const z = maps.z_mm;
  const r = maps.r_mm;

  const potentialLayout = baseLayout("z (mm)", "r (mm)");
  potentialLayout.shapes = makePositiveRShapes(conductors);
  Plotly.react("potentialPlot", [{
    type: "heatmap",
    x: z,
    y: r,
    z: maps.potential_V,
    colorscale: "RdBu",
    reversescale: false,
    colorbar: { title: "V" },
    hovertemplate: "z=%{x:.3f} mm<br>r=%{y:.3f} mm<br>V=%{z:.3f} V<extra></extra>",
  }], potentialLayout, { responsive: true, displayModeBar: false });

  const fieldLayout = baseLayout("z (mm)", "r (mm)");
  fieldLayout.shapes = makePositiveRShapes(conductors);
  Plotly.react("fieldPlot", [{
    type: "heatmap",
    x: z,
    y: r,
    z: maps.field_log10,
    colorscale: "Plasma",
    colorbar: { title: "log10|E|" },
    hovertemplate: "z=%{x:.3f} mm<br>r=%{y:.3f} mm<br>log10|E|=%{z:.3f}<extra></extra>",
  }], fieldLayout, { responsive: true, displayModeBar: false });

  const axisLayout = {
    ...baseLayout("z (mm)", "Value"),
    legend: { orientation: "h", y: 1.12 },
  };
  Plotly.react("axisPlot", [
    {
      x: axis_profiles.z_mm,
      y: axis_profiles.V_axis_V,
      type: "scatter",
      mode: "lines",
      name: "V(0,z)",
    },
    {
      x: axis_profiles.z_mm,
      y: axis_profiles.Ez_axis_Vm,
      type: "scatter",
      mode: "lines",
      name: "Ez(0,z)",
      yaxis: "y2",
    }
  ], {
    ...axisLayout,
    yaxis2: {
      overlaying: "y",
      side: "right",
      title: "Ez (V/m)",
      gridcolor: "rgba(255,255,255,0)",
      color: "#d9e6ff",
    }
  }, { responsive: true, displayModeBar: false });
}

function renderTracePlots(trace) {
  if (!trace) return;
  const bg = trace.field_background;
  const mirrored = mirrorMap(bg.r_mm, bg.field_log10);
  const plotData = [{
    type: "heatmap",
    x: bg.z_mm,
    y: mirrored.y,
    z: mirrored.z,
    colorscale: "Plasma",
    colorbar: { title: "log10|E|" },
    hovertemplate: "z=%{x:.3f} mm<br>x=%{y:.3f} mm<br>log10|E|=%{z:.3f}<extra></extra>",
  }];

  trace.trajectories.forEach((traj, idx) => {
    plotData.push({
      x: traj.z_mm,
      y: traj.x_mm,
      type: "scatter",
      mode: "lines",
      line: { width: 1.1, color: "rgba(255,255,255,0.86)" },
      hoverinfo: "skip",
      showlegend: false,
    });
    plotData.push({
      x: traj.z_mm,
      y: traj.x_mm.map(v => -v),
      type: "scatter",
      mode: "lines",
      line: { width: 1.1, color: "rgba(255,255,255,0.86)" },
      hoverinfo: "skip",
      showlegend: false,
    });
  });

  const layout = {
    ...baseLayout("z (mm)", "x (mm)"),
    shapes: makeMirroredShapes(trace.conductors),
  };
  Plotly.react("trajectoryPlot", plotData, layout, { responsive: true, displayModeBar: false });

  const beam = trace.beam_metrics;
  if (beam) {
    Plotly.react("beamPlot", [
      {
        x: beam.z_mm,
        y: beam.rms_x_um,
        type: "scatter",
        mode: "lines",
        name: "RMS radius (µm)",
      },
      {
        x: beam.z_mm,
        y: beam.m_fit,
        type: "scatter",
        mode: "lines",
        name: "m_fit",
        yaxis: "y2",
      },
    ], {
      ...baseLayout("z (mm)", "RMS radius (µm)"),
      legend: { orientation: "h", y: 1.12 },
      yaxis2: {
        overlaying: "y",
        side: "right",
        title: "m_fit",
        gridcolor: "rgba(255,255,255,0)",
        color: "#d9e6ff",
      },
    }, { responsive: true, displayModeBar: false });
  }
}

function mirrorMap(rMm, matrix) {
  const y = [...rMm.slice(1).reverse().map(v => -v), ...rMm];
  const z = [];
  for (let i = matrix.length - 1; i >= 1; i--) z.push(matrix[i].slice());
  for (let i = 0; i < matrix.length; i++) z.push(matrix[i].slice());
  return { y, z };
}

function makePositiveRShapes(conductors) {
  const shapes = [];
  const forest = conductors.forest;
  shapes.push({
    type: "rect",
    xref: "x", yref: "y",
    x0: 0, x1: forest.height_mm,
    y0: 0, y1: forest.radius_mm,
    line: { color: "rgba(255,255,255,0.6)", width: 1 },
    fillcolor: "rgba(255,255,255,0.18)",
  });
  conductors.electrodes.forEach(el => {
    shapes.push({
      type: "rect",
      xref: "x", yref: "y",
      x0: el.z_start_mm, x1: el.z_end_mm,
      y0: el.r_inner_mm, y1: el.r_outer_mm,
      line: { color: "rgba(255,255,255,0.7)", width: 1 },
      fillcolor: el.name === "E2" ? "rgba(255,70,70,0.24)" : "rgba(255,255,255,0.16)",
    });
  });
  return shapes;
}

function makeMirroredShapes(conductors) {
  const shapes = [];
  const forest = conductors.forest;
  shapes.push({
    type: "rect",
    xref: "x", yref: "y",
    x0: 0, x1: forest.height_mm,
    y0: -forest.radius_mm, y1: forest.radius_mm,
    line: { color: "rgba(255,255,255,0.6)", width: 1 },
    fillcolor: "rgba(255,255,255,0.16)",
  });
  conductors.electrodes.forEach(el => {
    const color = el.name === "E2" ? "rgba(255,70,70,0.22)" : "rgba(255,255,255,0.14)";
    shapes.push({
      type: "rect",
      xref: "x", yref: "y",
      x0: el.z_start_mm, x1: el.z_end_mm,
      y0: el.r_inner_mm, y1: el.r_outer_mm,
      line: { color: "rgba(255,255,255,0.7)", width: 1 },
      fillcolor: color,
    });
    shapes.push({
      type: "rect",
      xref: "x", yref: "y",
      x0: el.z_start_mm, x1: el.z_end_mm,
      y0: -el.r_outer_mm, y1: -el.r_inner_mm,
      line: { color: "rgba(255,255,255,0.7)", width: 1 },
      fillcolor: color,
    });
  });
  return shapes;
}

function baseLayout(xTitle, yTitle) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 64, r: 24, t: 20, b: 56 },
    xaxis: {
      title: xTitle,
      gridcolor: "rgba(255,255,255,0.08)",
      zerolinecolor: "rgba(255,255,255,0.08)",
      color: "#d9e6ff",
    },
    yaxis: {
      title: yTitle,
      gridcolor: "rgba(255,255,255,0.08)",
      zerolinecolor: "rgba(255,255,255,0.08)",
      color: "#d9e6ff",
    },
    font: { color: "#eaf2ff" },
  };
}

function formatSeconds(v) {
  return Number.isFinite(v) ? `${v.toFixed(v >= 1 ? 2 : 3)} s` : "—";
}
function formatKV(v) {
  return Number.isFinite(v) ? `${(v / 1000).toFixed(2)} kV` : "—";
}
function formatScientific(v) {
  return Number.isFinite(v) ? Number(v).toExponential(3) : "—";
}
function formatMm(v) {
  return Number.isFinite(v) ? `${(v * 1000).toFixed(3)} mm` : "—";
}
function formatUm(v) {
  return Number.isFinite(v) ? `${(v * 1e6).toFixed(3)} µm` : "—";
}
function formatFraction(v) {
  return Number.isFinite(v) ? `${(100 * v).toFixed(2)}%` : "—";
}

async function loadDefaults() {
  updateRuntimeBadge("busy", "Loading Pyodide runtime…");
  log("Requesting defaults from the worker.");
  const defaults = await callWorker("defaults");
  defaultConfig = defaults;
  renderForm(defaultConfig);
  renderSummaryCards(null, null);
  updateRuntimeBadge("ready", "Runtime ready");
  log("Defaults loaded.");
}

async function runSolveField() {
  try {
    setBusy(true);
    const config = collectConfig();
    log("Solving electrostatic field.");
    const result = await callWorker("solveField", { config });
    if (result.status !== "ok") {
      showWarnings(result.warnings, result.errors);
      return;
    }
    latestField = result.field;
    latestTrace = null;
    showWarnings(result.field.warnings || [], result.errors || []);
    renderSummaryCards(result.field, null);
    renderResolutionTable(result.field);
    renderFieldPlots(result.field);
    Plotly.purge("trajectoryPlot");
    Plotly.purge("beamPlot");
    log("Field solve completed.");
  } catch (err) {
    log(`Field solve failed: ${err.message}`);
    updateRuntimeBadge("error", "Runtime error");
  } finally {
    setBusy(false);
  }
}

async function runSolveTrace(forceRebuild = true) {
  try {
    setBusy(true);
    const config = collectConfig();
    log(forceRebuild ? "Solving field and tracing bundle." : "Tracing bundle with cached field when possible.");
    const result = await callWorker("traceBundle", { config, forceRebuild });
    if (result.status !== "ok") {
      showWarnings(result.warnings, result.errors);
      return;
    }
    latestField = result.field;
    latestTrace = result.trace;
    showWarnings(result.warnings || [], result.errors || []);
    renderSummaryCards(result.field, result.trace);
    renderResolutionTable(result.field);
    renderFieldPlots(result.field);
    renderTracePlots(result.trace);
    log("Bundle trace completed.");
  } catch (err) {
    log(`Bundle trace failed: ${err.message}`);
    updateRuntimeBadge("error", "Runtime error");
  } finally {
    setBusy(false);
  }
}

async function copyConfig() {
  const config = collectConfig();
  const jsonText = JSON.stringify(config, null, 2);
  await navigator.clipboard.writeText(jsonText);
  log("Copied config JSON to the clipboard.");
}

els.restoreDefaultsBtn.addEventListener("click", () => {
  if (!defaultConfig) return;
  applyConfigToForm(defaultConfig);
  log("Restored defaults.");
});
els.solveFieldBtn.addEventListener("click", runSolveField);
els.solveTraceBtn.addEventListener("click", () => runSolveTrace(true));
els.traceOnlyBtn.addEventListener("click", () => runSolveTrace(false));
els.copyConfigBtn.addEventListener("click", copyConfig);

window.addEventListener("load", async () => {
  try {
    await loadDefaults();
  } catch (err) {
    log(`Initialization failed: ${err.message}`);
    updateRuntimeBadge("error", "Initialization failed");
  }
});
