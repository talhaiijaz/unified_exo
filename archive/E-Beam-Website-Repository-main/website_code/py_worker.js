
const PYODIDE_VERSION = "0.29.3";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReadyPromise = null;

function postLog(message, status = null) {
  self.postMessage({ type: "log", message, status });
}

async function loadRuntime() {
  if (pyodideReadyPromise) return pyodideReadyPromise;

  pyodideReadyPromise = (async () => {
    postLog(`Loading Pyodide ${PYODIDE_VERSION} from the stable CDN.`, "busy");
    self.importScripts(`${INDEX_URL}pyodide.js`);
    const pyodide = await loadPyodide({ indexURL: INDEX_URL });
    postLog("Loading Python packages: numpy, scipy, pandas.", "busy");
    await pyodide.loadPackage(["numpy", "scipy", "pandas"]);

    postLog("Loading cnt_einzel_model.py.", "busy");
    const response = await fetch("cnt_einzel_model.py", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Could not fetch cnt_einzel_model.py");
    }
    const source = await response.text();
    pyodide.FS.writeFile("cnt_einzel_model.py", source);
    await pyodide.runPythonAsync("import cnt_einzel_model");
    postLog("Runtime ready.", "ready");
    return pyodide;
  })();

  return pyodideReadyPromise;
}

async function runPythonJson(pyodide, code, globals = {}) {
  Object.entries(globals).forEach(([name, value]) => {
    pyodide.globals.set(name, value);
  });
  const result = await pyodide.runPythonAsync(code);
  Object.keys(globals).forEach((name) => pyodide.globals.delete(name));
  return JSON.parse(result);
}

self.addEventListener("message", async (event) => {
  const { id, action, payload } = event.data;
  try {
    const pyodide = await loadRuntime();
    let data;

    if (action === "defaults") {
      data = await runPythonJson(pyodide, `
import cnt_einzel_model
cnt_einzel_model.get_default_config_json()
      `);
    } else if (action === "solveField") {
      const configJson = JSON.stringify(payload?.config || {});
      data = await runPythonJson(pyodide, `
import cnt_einzel_model
cnt_einzel_model.solve_fields_json(config_json)
      `, { config_json: configJson });
    } else if (action === "traceBundle") {
      const configJson = JSON.stringify(payload?.config || {});
      const forceRebuild = payload?.forceRebuild ? "True" : "False";
      data = await runPythonJson(pyodide, `
import json
import cnt_einzel_model
data = json.loads(config_json)
result = cnt_einzel_model.trace_bundle_for_config(data, force_rebuild=${forceRebuild})
json.dumps(result)
      `, { config_json: configJson });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    self.postMessage({ type: "response", id, ok: true, data });
  } catch (error) {
    postLog(`Worker error: ${error.message}`, "error");
    self.postMessage({ type: "response", id, ok: false, error: error.message });
  }
});
