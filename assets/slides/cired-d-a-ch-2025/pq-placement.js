/*
  PQ‑Placement visualisation logic

  The script is separated from the HTML markup to simplify embedding
  this tool into other pages (e.g. a Jekyll post).  It uses Plotly
  for plotting and d3 for the 2D force‑layout calculation.  A
  highscore tracking mechanism records the best observability score
  achieved during a session and displays the corresponding bus
  selections.
*/

/* ===========================================
   GLOBALS & STATE
=========================================== */

// Default number of measurement devices preselected on page load.
// Change this value to choose a different default.  It should be an
// integer between 1 and the maximum number of radio options provided
// in the HTML.
const DEFAULT_MAX_DEVICES = 3;

// 3D rendering is disabled for now.  is3DMode remains false.
let is3DMode = false;
let updatingColors = false;
let activeBuses = [];
let maxDevices = DEFAULT_MAX_DEVICES;
let buses = [];
let affinity = [];
let isDragging = false;
let clickLock = false;
let layout2D = null;
let layout3D = null;
let edgeList = [];
let validBusIds = [];
let currentScore = 0.0;

// Highscore tracking
let highScore = 0.0;
let bestLocations = [];

// Map bus id -> nominal voltage in kV.  Populated from nodes.json or
// deduced from transformer definitions.
let busVoltages = {};
let maxVoltage = 0.0;

// Node trace index is determined when plotting and used to update
// colours/symbols.  Plotly traces are rendered in the order listed in
// drawCurrentMode() below.  The node trace always comes last.
let nodeTraceIndex = 0;

// CURRENT NETWORK ID
let currentNetworkId = null;

/* ===========================================
   DISCOVER NETWORK FOLDERS
=========================================== */
async function discoverNetworks() {
  try {
    const resp = await fetch("networks.json", { cache: "no-cache" });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    console.error("Cannot load networks.json:", e);
  }
  return [];
}

function populateNetworkDropdown(list) {
  const sel = document.getElementById("networkSelector");
  sel.innerHTML = "";

  if (list.length === 0) {
    let opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Kein Netzwerk gefunden";
    sel.appendChild(opt);
    return;
  }

  for (let net of list) {
    let opt = document.createElement("option");
    opt.value = net;
    opt.textContent = net;
    sel.appendChild(opt);
  }
}

/* ===========================================
   LOAD NETWORK
=========================================== */
async function loadData(networkFolder) {
  try {
    const [posResp, edgeResp, affResp] = await Promise.all([
      fetch(`${networkFolder}/positions.json`),
      fetch(`${networkFolder}/edges.json`),
      fetch(`${networkFolder}/affinity.json`)
    ]);

    if (!posResp.ok || !edgeResp.ok || !affResp.ok)
      throw new Error("Missing files");

    return {
      positions: await posResp.json(),
      edges: await edgeResp.json(),
      affinityData: await affResp.json()
    };
  } catch (e) {
    alert("Fehler beim Laden aus Ordner: " + networkFolder);
    document.getElementById("loadingOverlay").classList.add("hidden");
    return null;
  }
}

function sagValueToColor(v) {
  v = Math.max(0, Math.min(1, v));
  const white = {r: 255, g: 255, b: 255};
  const lightR = {r: 255, g: 200, b: 200};
  const midR = {r: 255, g: 0, b: 0};
  const darkR = {r: 160, g: 0, b: 0};

  function lerp(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  let c;
  if (v <= 0) c = white;
  else if (v < 0.2) c = lerp(white, lightR, v / 0.2);
  else if (v < 0.6) c = lerp(lightR, midR, (v - 0.2) / 0.4);
  else c = lerp(midR, darkR, (v - 0.6) / 0.4);
  return `rgb(${c.r},${c.g},${c.b})`;
}

function computeScore(combined) {
  const threshold = 0.2;
  let observable = combined.reduce((acc, v) => acc + (v >= threshold ? 1 : 0), 0);
  currentScore = observable / combined.length;
  // update current score display
  const scoreBox = document.getElementById("scoreBox");
  scoreBox.innerHTML = `Observability: ${currentScore.toFixed(3)}`;
  // update highscore if new record
  if (currentScore > highScore && activeBuses.length > 0) {
    highScore = currentScore;
    bestLocations = [...activeBuses];
    updateHighscoreDisplay();
  }
  updateArrowPosition();
}

function updateArrowPosition() {
  const arrow = document.getElementById("indicatorArrow");
  const isMobile = window.innerWidth <= 768;
  const pct = Math.min(1, Math.max(0, currentScore)) * 100;

  if (isMobile) {
    arrow.style.left = pct + "%";
    arrow.style.top = "-15px";
    arrow.style.bottom = "";
  } else {
    arrow.style.bottom = pct + "%";
    arrow.style.left = "-12px";
    arrow.style.top = "";
  }
}

function updateHighscoreDisplay() {
  const hsBox = document.getElementById("highscoreBox");
  if (highScore > 0 && bestLocations.length > 0) {
    const nodes = bestLocations.map(b => `bus_${b}`).join(", ");
    hsBox.innerHTML = `Persönlicher Highscore: ${highScore.toFixed(3)} (beste: ${nodes})`;
  } else {
    hsBox.innerHTML = "Persönlicher Highscore: —";
  }
}

async function loadNetwork(networkFolder) {
  const loader = document.getElementById("loadingOverlay");
  loader.classList.remove("hidden");

  const data = await loadData(networkFolder);
  if (!data) return;

  activeBuses = [];
  currentScore = 0;
  highScore = 0;
  bestLocations = [];
  document.getElementById("scoreBox").innerText = "Score: —";
  document.getElementById("highscoreBox").innerText = "Persönlicher Highscore: —";
  updateArrowPosition();

  const positions = data.positions;
  edgeList = data.edges;
  const affinityData = data.affinityData;

  buses = affinityData.buses.map(Number);
  affinity = affinityData.affinity;

  // Determine valid bus ids present in positions file
  validBusIds = buses.filter(b => positions["bus_" + b]);

  // load nominal voltages from nodes.json if present
  busVoltages = {};
  maxVoltage = 0;
  try {
    const nodeResp = await fetch(`${networkFolder}/nodes.json`);
    if (nodeResp.ok) {
      const nodesData = await nodeResp.json();
      for (let n of nodesData) {
        // Ensure id is numeric
        busVoltages[n.id] = n.vn_kv;
      }
    }
  } catch (e) {
  }
  // Fallback: derive voltages from transformer edges
  if (Object.keys(busVoltages).length === 0) {
    for (let e of edgeList) {
      if (e.type === "trafo") {
        const fromId = Number(e.from.replace("bus_", ""));
        const toId = Number(e.to.replace("bus_", ""));
        if (e.vn_hv_kv !== undefined) busVoltages[fromId] = e.vn_hv_kv;
        if (e.vn_lv_kv !== undefined) busVoltages[toId] = e.vn_lv_kv;
      }
    }
  }
  // Compute the highest voltage across all buses for HV detection
  const voltages = Object.values(busVoltages);
  if (voltages.length > 0) {
    maxVoltage = Math.max(...voltages);
  }

  // Compute layouts
  layout2D = computeForceLayout(validBusIds, edgeList);
  layout3D = compute3DLayout(validBusIds, positions);

  await drawCurrentMode();
  loader.classList.add("hidden");
}

/* ===========================================
   DRAW NETWORK
=========================================== */
function computeForceLayout(busIds, edges) {
  const initialRadius = 1000;
  const nodes = busIds.map((id, i) => {
    const angle = (i / busIds.length) * 2 * Math.PI;
    return {id: id, x: Math.cos(angle) * initialRadius, y: Math.sin(angle) * initialRadius};
  });
  const links = [];
  edges.forEach(e => {
    const source = Number(e.from.replace("bus_", ""));
    const target = Number(e.to.replace("bus_", ""));
    if (busIds.includes(source) && busIds.includes(target)) {
      links.push({source: source, target: target, type: e.type});
    }
  });
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(1))
    .force("charge", d3.forceManyBody().strength(-2000))
    .force("center", d3.forceCenter(0, 0))
    .force("collide", d3.forceCollide().radius(40).iterations(3))
    .stop();
  for (let i = 0; i < 600; ++i) simulation.tick();
  const coordMap = {};
  nodes.forEach(n => {
    coordMap[n.id] = {x: n.x, y: n.y};
  });
  return coordMap;
}

function compute3DLayout(busIds, positions) {
  const coords = busIds.map(id => positions["bus_" + id] || [0, 0, 0]);
  const xs = coords.map(p => p[0]);
  const ys = coords.map(p => p[1]);
  const zs = coords.map(p => p[2] || 0);

  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;

  const nx = xs.map(v => v - cx);
  const ny = ys.map(v => v - cy);
  const nz = zs.map(v => v - cz);

  const rng = Math.max(
    Math.max(...nx) - Math.min(...nx),
    Math.max(...ny) - Math.min(...ny),
    Math.max(...nz) - Math.min(...nz),
    1
  );

  const scale = 1000;
  const map = {};
  busIds.forEach((id, i) => {
    map[id] = {x: nx[i] / rng * scale, y: ny[i] / rng * scale, z: nz[i] / rng * scale};
  });
  return map;
}

function isHV(id) {
  // returns true if the bus is on the high voltage side.  If no
  // voltage data is available, it always returns false.
  if (busVoltages[id] === undefined || maxVoltage === 0) return false;
  return Math.abs(busVoltages[id] - maxVoltage) < 1e-6;
}

function drawCurrentMode() {
  return new Promise(resolve => {
    const coords = is3DMode ? layout3D : layout2D;
    const is3 = is3DMode;

    // Node coordinate arrays
    const x = [], y = [], z = [];
    for (let id of validBusIds) {
      x.push(coords[id].x);
      y.push(coords[id].y);
      if (is3) z.push(coords[id].z);
    }

    // Line segments for normal branches and transformer branches
    const lineX = [], lineY = [], lineZ = [];
    const trafoX = [], trafoY = [], trafoZ = [];
    // Data for transformer icon markers (two intersecting circles)
    const iconX = [], iconY = [], iconZ = [];

    for (let e of edgeList) {
      const a = Number(e.from.replace("bus_", ""));
      const b = Number(e.to.replace("bus_", ""));
      if (!coords[a] || !coords[b]) continue;
      if (e.type === "trafo") {
        // Transformer line (drawn light to emphasise icon)
        trafoX.push(coords[a].x, coords[b].x, null);
        trafoY.push(coords[a].y, coords[b].y, null);
        if (is3) trafoZ.push(coords[a].z, coords[b].z, null);
        // compute icon positions for 2D mode only; in 3D mode we don't
        // attempt to draw the icon because projecting an orientation
        // into three dimensions requires more complex transforms
        const x1 = coords[a].x;
        const y1 = coords[a].y;
        const x2 = coords[b].x;
        const y2 = coords[b].y;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        if (!is3) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            // offset proportional to edge length (5 %)
            const offset = 0.05 * len;
            const ox = -dy / len * offset;
            const oy = dx / len * offset;
            // two points offset in opposite directions
            iconX.push(mx + ox, mx - ox);
            iconY.push(my + oy, my - oy);
          } else {
            iconX.push(mx, mx);
            iconY.push(my, my);
          }
        } else {
          // in 3D simply place icons at the midpoint (no offset)
          const mz = (coords[a].z + coords[b].z) / 2;
          iconX.push(mx);
          iconY.push(my);
          iconZ.push(mz);
        }
      } else {
        lineX.push(coords[a].x, coords[b].x, null);
        lineY.push(coords[a].y, coords[b].y, null);
        if (is3) lineZ.push(coords[a].z, coords[b].z, null);
      }
    }

    // Node trace: markers for buses
    // colours, symbols and sizes are initialised here; they will
    // be updated dynamically in updateColors()
    const initialColor = validBusIds.map(_ => "rgb(255,255,255)");
    const initialSymbols = validBusIds.map(id => isHV(id) ? 'square' : 'circle');
    // enlarge the default marker size by 50 % (12 → 18) when rendering in 2D
    const initialSizes = validBusIds.map(_ => is3 ? 9 : 18);

    const traceNodes = {
      x: x,
      y: y,
      z: is3 ? z : undefined,
      mode: "markers",
      type: is3 ? "scatter3d" : "scatter",
      marker: {
        size: initialSizes,
        color: initialColor,
        symbol: initialSymbols,
        line: {width: 1, color: "black"}
      },
      customdata: validBusIds,
      hovertemplate: "Bus %{customdata}<extra></extra>",
      showlegend: false
    };

    const traceLines = {
      x: lineX,
      y: lineY,
      z: is3 ? lineZ : undefined,
      mode: "lines",
      type: is3 ? "scatter3d" : "scatter",
      line: {width: is3 ? 5 : 2, color: "#999"},
      hoverinfo: "none",
      showlegend: false
    };

    // Transformer lines drawn in a lighter colour, the real
    // transformer visualisation comes from the icons below.
    const traceTrafos = {
      x: trafoX,
      y: trafoY,
      z: is3 ? trafoZ : undefined,
      mode: "lines",
      type: is3 ? "scatter3d" : "scatter",
      line: {width: is3 ? 5 : 2, color: "#c55"},
      hoverinfo: "none",
      showlegend: false
    };

    // Transformer icons: two circles per transformer edge in 2D; a
    // single icon in 3D located at the edge midpoint
    const traceTrafoIcons = {
      x: iconX,
      y: iconY,
      z: is3 ? iconZ : undefined,
      mode: "markers",
      type: is3 ? "scatter3d" : "scatter",
      marker: {
        symbol: is3 ? 'circle-open' : 'circle-open',
        size: is3 ? 12 : 12,
        color: 'rgba(200,0,0,0.0)',
        line: {width: 2, color: 'rgb(200,0,0)'}
      },
      hoverinfo: "none",
      showlegend: false
    };

    const data = [traceLines, traceTrafos, traceTrafoIcons, traceNodes];
    nodeTraceIndex = data.length - 1;

    const layout = {
      margin: {t: 0, l: 0, r: 0, b: 0},
      dragmode: is3 ? "orbit" : "pan",
      paper_bgcolor: "#e5e7eb",
      plot_bgcolor: "#e5e7eb",
      xaxis: {visible: false},
      yaxis: {visible: false, scaleanchor: "x", scaleratio: 1},
      scene: {
        xaxis: {visible: false},
        yaxis: {visible: false},
        zaxis: {visible: false},
        bgcolor: "#e5e7eb"
      }
    };
    // Show only a minimal set of interaction buttons
    const buttonsToShow = is3 ? [["orbitRotation", "pan3d", "resetCamera3d"]] : [["pan2d", "zoom2d", "resetScale2d"]];

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtons: buttonsToShow,
      scrollZoom: false
    };
    Plotly.newPlot("networkPlot", data, layout, config)
      .then(() => {
        attachPlotlyClick();
        updateColors();
        resolve();
      });
  });
}

function attachPlotlyClick() {
  const plot = document.getElementById("networkPlot");
  plot.removeAllListeners('plotly_click');
  plot.on("plotly_click", evt => {
    if (updatingColors) return;
    if (isDragging) return;
    if (clickLock) return;
    clickLock = true;
    setTimeout(() => {
      clickLock = false;
    }, 500);
    const pt = evt.points[0];
    // node trace is always the last; we check by curve number
    if (pt.curveNumber !== nodeTraceIndex) return;
    const bus = pt.customdata;
    const idx = activeBuses.indexOf(bus);
    if (idx !== -1) {
      activeBuses.splice(idx, 1);
    } else {
      activeBuses.push(bus);
      if (activeBuses.length > maxDevices) activeBuses.shift();
    }
    updateColors();
  });
}

function updateColors() {
  updatingColors = true;
  let colorsToApply;
  let symbolsToApply;
  let sizesToApply;
  const ids = validBusIds;
  if (activeBuses.length === 0) {
    colorsToApply = ids.map(() => "rgb(255,255,255)");
    symbolsToApply = ids.map(id => isHV(id) ? 'square' : 'circle');
    sizesToApply = ids.map(() => is3DMode ? 9 : 12);
    document.getElementById("scoreBox").innerText = "Score: —";
    currentScore = 0;
    updateArrowPosition();
  } else {
    const N = buses.length;
    const combined = new Array(N).fill(0);
    activeBuses.forEach(b => {
      const rowIndex = buses.indexOf(b);
      if (rowIndex === -1) return;
      const row = affinity[rowIndex];
      for (let i = 0; i < N; i++) combined[i] = Math.max(combined[i], row[i]);
    });
    colorsToApply = ids.map(id => {
      const i = buses.indexOf(id);
      return sagValueToColor(i === -1 ? 0 : combined[i]);
    });
    // assign symbols and sizes; selected buses get a star and larger size
    symbolsToApply = ids.map(id => {
      if (activeBuses.includes(id)) return 'star';
      return isHV(id) ? 'square' : 'circle';
    });
    sizesToApply = ids.map(id => {
      // selected nodes are drawn larger; enlarge base size by 50 %
      if (activeBuses.includes(id)) return is3DMode ? 12 : 24;
      return is3DMode ? 9 : 18;
    });
    computeScore(combined);
  }
  // update marker properties for node trace
  const update = {"marker.color": [colorsToApply], "marker.symbol": [symbolsToApply], "marker.size": [sizesToApply]};
  Plotly.restyle("networkPlot", update, [nodeTraceIndex]).then(() => {
    updatingColors = false;
  }).catch(() => {
    updatingColors = false;
  });
}

/* ===========================================
   UI
=========================================== */
document.addEventListener("DOMContentLoaded", async () => {
  const networks = await discoverNetworks();
  populateNetworkDropdown(networks);

  // set default number of devices and select appropriate radio button
  const radios = document.querySelectorAll("input[name=deviceCount]");
  radios.forEach(r => {
    if (Number(r.value) === DEFAULT_MAX_DEVICES) {
      r.checked = true;
    } else {
      r.checked = false;
    }
  });
  maxDevices = DEFAULT_MAX_DEVICES;

  if (networks.length > 0) {
    currentNetworkId = networks[0];
    loadNetwork(currentNetworkId);
  }
});

document.getElementById("networkSelector").addEventListener("change", e => {
  currentNetworkId = e.target.value;
  loadNetwork(currentNetworkId);
});

document.querySelectorAll("input[name=deviceCount]")
  .forEach(r => r.addEventListener("change", e => {
    maxDevices = Number(e.target.value);
    // Retain only the most recently chosen buses
    activeBuses = activeBuses.slice(-maxDevices);
    updateColors();
  }));

// There is no mode toggle button because 3D view is disabled.  If
// you reintroduce a button in the markup you can re‑enable this logic.
