// ---------- Helpers ----------
async function getJSON(url) {
  const r = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

const I18N = window.SAUNA_I18N || {};

function t(key, fallback) {
  const value = I18N[key];
  if (typeof value === "string" && value.length) return value;
  return fallback;
}

function tFormat(key, fallback, replacements) {
  let template = t(key, fallback);
  const pairs = replacements || {};

  Object.keys(pairs).forEach(function (name) {
    template = template.replace("__" + name.toUpperCase() + "__", String(pairs[name]));
  });

  return template;
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = v === null || v === undefined || v === "" ? "-" : String(v);
}

function setOnlineBadge(deviceId, online) {
  const el = document.getElementById("online-" + deviceId);
  if (!el) return;
  el.textContent = online ? t("online", "ONLINE") : t("offline", "OFFLINE");
  el.className = online ? "badge text-bg-success" : "badge text-bg-danger";
}

function toast(msg, variant) {
  const kind = variant || "primary";
  const t = document.getElementById("app-toast");
  const b = document.getElementById("app-toast-body");
  if (!t || !b || !window.bootstrap) return;

  t.className = "toast align-items-center text-bg-" + kind + " border-0";
  b.textContent = msg;

  const inst = bootstrap.Toast.getOrCreateInstance(t, { delay: 2200 });
  inst.show();
}

function setBusy(btn, busy, textWhenBusy) {
  const busyText = textWhenBusy || t("sending", "Sending...");
  if (!btn) return;

  if (busy) {
    btn.dataset._origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + busyText;
    return;
  }

  btn.disabled = false;
  if (btn.dataset._origHtml) {
    btn.innerHTML = btn.dataset._origHtml;
    delete btn.dataset._origHtml;
  }
}

function formatDiagValue(value) {
  if (value === null || value === undefined || value === "") return t("unavailable", "Unavailable");
  if (typeof value === "boolean") return value ? t("on", "ON") : t("off", "OFF");
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : t("unavailable", "Unavailable");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatEtaMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return "-";

  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
}

function firstAvailable(source, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return null;
}

const diagnosticSchema = [
  {
    section: t("controlsSection", "Controls"),
    rows: [
      [t("saunaClimate", "Sauna Climate"), ["mode"]],
      [t("setpointDegC", "Setpoint (degC)"), ["setpoint_c"]],
      [t("fan", "Fan"), ["fan_on"]],
      [t("light", "Light"), ["light_on"]],
      [t("amplifier", "Amplifier"), ["amp_on"]],
      [t("contactorActive", "Contactor Active"), ["contactor_active"]],
    ],
  },
  {
    section: t("configurationSection", "Configuration"),
    rows: [
      [t("boostWindowDegC", "Boost Window (degC)"), ["boost_window_c"]],
      [t("boostExitDegC", "Boost Exit (degC)"), ["boost_exit_c"]],
      [t("maxSessionMin", "Max Session (min)"), ["max_session_min"]],
      [t("fanDtSetpointDegC", "Fan dT Setpoint (degC)"), ["fan_dt_setpoint_c"]],
      [t("controlTempSource", "Control Temp Source"), ["control_temp_source"]],
      [t("controlTempSourceActive", "Control Temp Source Active"), ["control_temp_source_active"]],
    ],
  },
  {
    section: t("sensorsSection", "Sensors"),
    rows: [
      [t("tempTop", "Temp Top"), ["t_top_c"]],
      [t("tempHead", "Temp Head"), ["t_head_c"]],
      [t("tempUnder", "Temp Under"), ["t_under_c"]],
      [t("tempOutdoor", "Temp Outdoor"), ["t_outdoor_c"]],
      [t("tempControl", "Temp Control"), ["t_control"]],
      [t("stratDelta", "Strat Delta"), ["strat_delta_c"]],
      [t("powerW", "Power (W)"), ["power_w"]],
      [t("heatLossW", "Heat Loss (W)"), ["heat_loss_w"]],
      [t("heatLossKw", "Heat Loss (kW)"), ["heat_loss_kw"]],
      [t("heatingHeadroomKw", "Heating Headroom (kW)"), ["heating_headroom_kw"]],
      [t("sensorFault", "Sensor Fault"), ["sensor_fault"]],
      [t("controlTempValid", "Control Temp Valid"), ["control_temp_valid"]],
    ],
  },
  {
    section: t("modelsRuntimeSection", "Models & Runtime"),
    rows: [
      [t("etaA", "ETA A"), ["eta_model_a"]],
      [t("etaB", "ETA B"), ["eta_model_b"]],
      [t("etaAutoMin", "ETA Auto (min)"), ["eta_auto_min"]],
      [t("etaPredMin", "ETA Pred (min)"), ["eta_pred_min"]],
      [t("etaRmse", "ETA RMSE"), ["eta_rmse"]],
      [t("etaConfidence", "ETA Confidence"), ["eta_confidence"]],
      [t("etaPredRate", "ETA Pred Rate"), ["eta_pred_rate"]],
      [t("etaSamples", "ETA Samples"), ["eta_samples"]],
      [t("etaLearningActive", "ETA Learning Active"), ["eta_learning_active"]],
      [t("thermalSamples", "Thermal Samples"), ["thermal_model_samples"]],
      [t("thermalUa", "Thermal UA"), ["thermal_ua"]],
      [t("thermalC", "Thermal C"), ["thermal_c"]],
      [t("thermalTau", "Thermal Tau"), ["thermal_tau"]],
      [t("energyWh", "Energy Wh"), ["energy_wh"]],
      [t("energyKwh", "Energy kWh"), ["energy_kwh"]],
      [t("ovenRuntimeS", "Oven Runtime s"), ["oven_runtime_s"]],
      [t("fanRuntimeS", "Fan Runtime s"), ["fan_runtime_s"]],
      [t("lightRuntimeS", "Light Runtime s"), ["light_runtime_s"]],
      [t("ampRuntimeS", "Amp Runtime s"), ["amp_runtime_s"]],
      [t("boostActive", "Boost Active"), ["boost_active"]],
      [t("heaterPowerPct", "Heater Power pct"), ["heater_power_pct"]],
      [t("uptimeSeconds", "Uptime seconds"), ["uptime_seconds"]],
    ],
  },
];

function renderDiagnostics(deviceId, status) {
  const container = document.getElementById("diag-list-" + deviceId);
  if (!container) return;

  const source = Object.assign({}, status || {});

  let html = "";
  for (let g = 0; g < diagnosticSchema.length; g += 1) {
    const group = diagnosticSchema[g];
    html += '<div class="fw-semibold mt-2 mb-1">' + group.section + "</div>";
    html += '<div class="table-responsive"><table class="table table-sm table-striped align-middle mb-2"><tbody>';

    for (let r = 0; r < group.rows.length; r += 1) {
      const label = group.rows[r][0];
      const keys = group.rows[r][1];
      const value = firstAvailable(source, keys);
      html += '<tr><td style="width:65%;">' + label + '</td><td>' + formatDiagValue(value) + "</td></tr>";
    }

    html += "</tbody></table></div>";
  }

  container.innerHTML = html;
}

function setInputIfIdle(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (document.activeElement === el) return;
  if (value === undefined || value === null || value === "") return;
  el.value = value;
}

function syncDiagnosticControls(deviceId, status) {
  const s = status || {};
  setInputIfIdle("diag-boost-window-" + deviceId, s.boost_window_c);
  setInputIfIdle("diag-boost-exit-" + deviceId, s.boost_exit_c);
  setInputIfIdle("diag-max-session-" + deviceId, s.max_session_min);
  setInputIfIdle("diag-fan-dt-" + deviceId, s.fan_dt_setpoint_c);

  const sourceEl = document.getElementById("diag-control-source-" + deviceId);
  if (sourceEl && document.activeElement !== sourceEl && s.control_temp_source) {
    sourceEl.value = s.control_temp_source;
  }
}

// ---------- Device Selection ----------
const STORAGE_KEY = "sauna_selected_device";

function getAllDeviceIds() {
  return Array.from(document.querySelectorAll(".device-view"))
    .map(function (el) { return el.getAttribute("data-device"); })
    .filter(Boolean);
}

function setActiveDevice(deviceId) {
  if (!deviceId) return;

  document.querySelectorAll(".device-view").forEach(function (el) {
    el.style.display = "none";
  });

  const selected = document.querySelector('.device-view[data-device="' + deviceId + '"]');
  if (!selected) return;

  selected.style.display = "block";
  localStorage.setItem(STORAGE_KEY, deviceId);

  const sel = document.getElementById("device-select");
  if (sel) sel.value = deviceId;
}

function initDeviceSelection() {
  const devices = getAllDeviceIds();
  if (!devices.length) return;

  const saved = localStorage.getItem(STORAGE_KEY);
  const defaultDevice = saved && devices.indexOf(saved) >= 0 ? saved : devices[0];
  setActiveDevice(defaultDevice);

  const sel = document.getElementById("device-select");
  if (sel) {
    sel.addEventListener("change", function (ev) {
      setActiveDevice(ev.target.value);
      refreshDevice(ev.target.value);
    });
  }
}

const charts = {};
const chartRangeHours = {};
const setpointSubmitTimers = {};
const setpointOptimistic = {};
const modeOptimistic = {};
const controlOptimistic = {};
const deviceTruth = {};

function setSetpointOptimistic(deviceId, value, ttlMs) {
  const ttl = ttlMs || 8000;
  const n = Number(value);
  if (!Number.isFinite(n)) return;

  setpointOptimistic[deviceId] = {
    value: n,
    untilMs: Date.now() + ttl,
  };
}

function clearSetpointOptimistic(deviceId) {
  if (setpointOptimistic[deviceId]) {
    delete setpointOptimistic[deviceId];
  }
}

function getEffectiveSetpoint(deviceId, serverValue) {
  const optimistic = setpointOptimistic[deviceId];
  if (!optimistic) return serverValue;

  const serverNum = Number(serverValue);
  if (Number.isFinite(serverNum) && Math.abs(serverNum - optimistic.value) < 0.001) {
    clearSetpointOptimistic(deviceId);
    return serverNum;
  }

  if (Date.now() <= optimistic.untilMs) {
    return optimistic.value;
  }

  clearSetpointOptimistic(deviceId);
  return serverValue;
}

function setModeOptimistic(deviceId, mode, ttlMs) {
  const ttl = ttlMs || 8000;
  const normalized = String(mode || "").toUpperCase();
  if (normalized !== "HEAT" && normalized !== "OFF") return;

  modeOptimistic[deviceId] = {
    value: normalized,
    untilMs: Date.now() + ttl,
  };
}

function clearModeOptimistic(deviceId) {
  if (modeOptimistic[deviceId]) {
    delete modeOptimistic[deviceId];
  }
}

function getEffectiveMode(deviceId, serverMode) {
  const optimistic = modeOptimistic[deviceId];
  const normalizedServer = String(serverMode || "").toUpperCase();

  if (!optimistic) return normalizedServer || serverMode;

  if (normalizedServer === optimistic.value) {
    clearModeOptimistic(deviceId);
    return normalizedServer;
  }

  if (Date.now() <= optimistic.untilMs) {
    return optimistic.value;
  }

  clearModeOptimistic(deviceId);
  return normalizedServer || serverMode;
}

function setControlOptimistic(deviceId, key, value, ttlMs) {
  const ttl = ttlMs || 8000;
  if (!controlOptimistic[deviceId]) {
    controlOptimistic[deviceId] = {};
  }

  controlOptimistic[deviceId][key] = {
    value: value,
    untilMs: Date.now() + ttl,
  };
}

function clearControlOptimistic(deviceId, key) {
  if (!controlOptimistic[deviceId] || !controlOptimistic[deviceId][key]) return;

  delete controlOptimistic[deviceId][key];
  if (Object.keys(controlOptimistic[deviceId]).length === 0) {
    delete controlOptimistic[deviceId];
  }
}

function getEffectiveControl(deviceId, key, serverValue) {
  const optimistic = controlOptimistic[deviceId] ? controlOptimistic[deviceId][key] : null;
  if (!optimistic) return serverValue;

  if (serverValue !== undefined && serverValue !== null) {
    if (typeof optimistic.value === "boolean") {
      if (Boolean(serverValue) === optimistic.value) {
        clearControlOptimistic(deviceId, key);
        return Boolean(serverValue);
      }
    } else if (String(serverValue) === String(optimistic.value)) {
      clearControlOptimistic(deviceId, key);
      return serverValue;
    }
  }

  if (Date.now() <= optimistic.untilMs) {
    return optimistic.value;
  }

  clearControlOptimistic(deviceId, key);
  return serverValue;
}

function ensureChart(deviceId) {
  const el = document.getElementById("chart-" + deviceId);
  if (!el || !window.Chart) return null;
  if (charts[deviceId]) return charts[deviceId];

  const ctx = el.getContext("2d");
  charts[deviceId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "T top", data: [], tension: 0.2 },
        { label: "T head", data: [], tension: 0.2 },
        { label: "T under", data: [], tension: 0.2 },
        { label: "Setpoint", data: [], tension: 0.2 },
        { label: "Heater %", data: [], tension: 0.1, yAxisID: "y2", borderDash: [4, 3] },
        { label: "Contactor", data: [], tension: 0, yAxisID: "y2", borderDash: [2, 2] },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: false },
        y2: {
          position: "right",
          min: 0,
          max: 110,
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  return charts[deviceId];
}

async function refreshChart(deviceId) {
  const ch = ensureChart(deviceId);
  if (!ch) return;

  const hours = chartRangeHours[deviceId] || 2;
  const data = await getJSON("/api/telemetry_series?device_id=" + encodeURIComponent(deviceId) + "&hours=" + hours + "&limit=480");
  const rows = data.rows || [];

  ch.data.labels = rows.map(function (r) {
    const d = new Date(r.ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
  ch.data.datasets[0].data = rows.map(function (r) { return r.t_top_c; });
  ch.data.datasets[1].data = rows.map(function (r) { return r.t_head_c; });
  ch.data.datasets[2].data = rows.map(function (r) { return r.t_under_c; });
  ch.data.datasets[3].data = rows.map(function (r) { return r.setpoint_c; });
  ch.data.datasets[4].data = rows.map(function (r) { return r.heater_power_pct != null ? r.heater_power_pct : null; });
  ch.data.datasets[5].data = rows.map(function (r) { return r.contactor_active != null ? (r.contactor_active ? 100 : 0) : null; });
  ch.update();
}

function setToggleUI(deviceId, what, isOn) {
  const btn = document.getElementById(what + "-btn-" + deviceId);
  const hidden = document.getElementById(what + "-on-" + deviceId);
  if (!btn || !hidden) return;

  const icons = { fan: "bi-fan", light: "bi-lightbulb", amp: "bi-speaker" };
  const labels = { fan: t("fan", "Fan"), light: t("light", "Light"), amp: t("amplifier", "Amplifier") };
  const colors = { fan: "primary", light: "warning", amp: "secondary" };

  if (isOn === null || isOn === undefined) {
    btn.className = "btn btn-outline-secondary btn-lg w-100 d-flex align-items-center justify-content-between";
    btn.innerHTML = '<span class="d-flex align-items-center gap-2"><i class="bi ' + icons[what] + '"></i><span>' + labels[what] + '</span></span><span class="badge">-</span>';
    hidden.value = "1";
    return;
  }

  if (isOn) {
    btn.className = "btn btn-" + colors[what] + " btn-lg w-100 d-flex align-items-center justify-content-between";
    btn.innerHTML = '<span class="d-flex align-items-center gap-2"><i class="bi ' + icons[what] + '"></i><span>' + labels[what] + '</span></span><span class="badge text-bg-light">' + t("on", "ON") + "</span>";
    hidden.value = "0";
    return;
  }

  btn.className = "btn btn-outline-" + colors[what] + " btn-lg w-100 d-flex align-items-center justify-content-between";
  btn.innerHTML = '<span class="d-flex align-items-center gap-2"><i class="bi ' + icons[what] + '"></i><span>' + labels[what] + '</span></span><span class="badge text-bg-secondary">' + t("off", "OFF") + "</span>";
  hidden.value = "1";
}

function setModeUI(deviceId, mode) {
  const modeOffRadio = document.getElementById("mode-off-" + deviceId);
  const modeHeatRadio = document.getElementById("mode-heat-" + deviceId);
  if (!modeOffRadio || !modeHeatRadio) return;

  const normalized = String(mode || "").toUpperCase() === "HEAT" ? "HEAT" : "OFF";
  modeHeatRadio.checked = normalized === "HEAT";
  modeOffRadio.checked = normalized !== "HEAT";
}

async function refreshDevice(deviceId) {
  try {
    const st = await getJSON("/api/device_status?device_id=" + encodeURIComponent(deviceId));
    const s = st.status || {};

    setOnlineBadge(deviceId, !!st.online);
    setText("online-status-" + deviceId, st.online ? t("online", "ONLINE") : t("offline", "OFFLINE"));
    setText("last-ack-" + deviceId, st.last_ack_id);
    setText("lastseen-" + deviceId, st.last_seen ? new Date(st.last_seen).toLocaleString() : "-");

    const mode = getEffectiveMode(deviceId, s.mode);
    const fanOn = getEffectiveControl(deviceId, "fan", s.fan_on);
    const lightOn = getEffectiveControl(deviceId, "light", s.light_on);
    const ampOn = getEffectiveControl(deviceId, "amp", s.amp_on);

    deviceTruth[deviceId] = {
      mode: mode,
      fan: fanOn,
      light: lightOn,
      amp: ampOn,
    };

    const saunaStatusEl = document.getElementById("sauna-status-" + deviceId);
    if (saunaStatusEl) {
      const isOn = mode === "HEAT" || !!fanOn || !!lightOn || !!ampOn;
      saunaStatusEl.innerHTML = isOn
        ? '<span class="badge text-bg-warning">' + t("saunaOn", "SAUNA ON") + "</span>"
        : '<span class="badge text-bg-secondary">' + t("saunaOff", "SAUNA OFF") + "</span>";
    }

    const lightStatusEl = document.getElementById("light-status-" + deviceId);
    if (lightStatusEl) {
      lightStatusEl.innerHTML = lightOn
        ? '<span class="badge text-bg-info"><i class="bi bi-lightbulb-fill"></i> ' + t("lightOnLabel", "Light on") + "</span>"
        : '<span class="badge text-bg-secondary"><i class="bi bi-lightbulb"></i> ' + t("lightOffLabel", "Light off") + "</span>";
    }

    const fanStatusEl = document.getElementById("fan-status-" + deviceId);
    if (fanStatusEl) {
      fanStatusEl.innerHTML = fanOn
        ? '<span class="badge text-bg-info"><i class="bi bi-fan-fill"></i> ' + t("fanOnLabel", "Fan on") + "</span>"
        : '<span class="badge text-bg-secondary"><i class="bi bi-fan"></i> ' + t("fanOffLabel", "Fan off") + "</span>";
    }

    const ampStatusEl = document.getElementById("amp-status-" + deviceId);
    if (ampStatusEl) {
      ampStatusEl.innerHTML = ampOn
        ? '<span class="badge text-bg-info"><i class="bi bi-speaker-fill"></i> ' + t("ampOnLabel", "Amplifier on") + "</span>"
        : '<span class="badge text-bg-secondary"><i class="bi bi-speaker"></i> ' + t("ampOffLabel", "Amplifier off") + "</span>";
    }

    const modeEl = document.getElementById("mode-" + deviceId);
    if (modeEl) {
      const isHeaterOn = mode === "HEAT" || (s.heater_power_pct || 0) > 0;
      modeEl.innerHTML = isHeaterOn
        ? '<span class="badge text-bg-success">' + t("on", "ON") + "</span>"
        : '<span class="badge text-bg-secondary">' + t("off", "OFF") + "</span>";
    }

    const effectiveSetpoint = getEffectiveSetpoint(deviceId, s.setpoint_c);

    setText("sp-" + deviceId, effectiveSetpoint);
    setText("ttop-" + deviceId, s.t_top_c);
    setText("thead-" + deviceId, s.t_head_c);
    setText("tunder-" + deviceId, s.t_under_c);
    setText("outdoor-temp-" + deviceId, s.t_outdoor_c);
    setText("control-temp-value-" + deviceId, s.t_control);
    setText("control-temp-source-" + deviceId, firstAvailable(s, ["control_temp_source_active", "control_temp_source"]));
    setText("control-temp-valid-" + deviceId, s.control_temp_valid);
    setText("control-strat-delta-" + deviceId, s.strat_delta_c);
    const etaToSetpointMin = firstAvailable(s, ["eta_auto_min", "eta_pred_min"]);
    setText("eta-setpoint-" + deviceId, formatEtaMinutes(etaToSetpointMin));

    setToggleUI(deviceId, "fan", fanOn);
    setToggleUI(deviceId, "light", lightOn);
    setToggleUI(deviceId, "amp", ampOn);

    if (mode) setModeUI(deviceId, mode);

    const setpointRange = document.getElementById("setpoint-range-" + deviceId);
    const setpointValue = document.getElementById("setpoint-value-" + deviceId);
    if (setpointRange && effectiveSetpoint !== undefined && effectiveSetpoint !== null) {
      // Avoid snapping while user drags; keep slider stable until ACK/telemetry catches up.
      if (document.activeElement !== setpointRange) {
        setpointRange.value = effectiveSetpoint;
      }
      if (setpointValue) setpointValue.textContent = effectiveSetpoint;
    }

    syncDiagnosticControls(deviceId, s);
    renderDiagnostics(deviceId, s);

    const cmdsEl = document.getElementById("cmds-" + deviceId);
    if (cmdsEl) {
      const c = await getJSON("/api/device_commands?device_id=" + encodeURIComponent(deviceId));
      cmdsEl.textContent = JSON.stringify(c.pending || [], null, 2);
    }
  } catch (e) {
    setOnlineBadge(deviceId, false);
    setText("online-status-" + deviceId, t("offline", "OFFLINE"));
  }

  try {
    await refreshChart(deviceId);
  } catch (e) {
    // Ignore chart fetch errors without breaking the page.
  }
}

async function refreshAll() {
  const devices = getAllDeviceIds();
  if (!devices.length) return;

  const selected = localStorage.getItem(STORAGE_KEY) || devices[0];
  await refreshDevice(selected);
}

document.addEventListener("click", async function (ev) {
  const btn = ev.target.closest(".chart-range");
  if (!btn) return;

  const deviceId = btn.getAttribute("data-device");
  const hours = parseFloat(btn.getAttribute("data-hours") || "2");
  if (!deviceId) return;

  chartRangeHours[deviceId] = hours;

  document.querySelectorAll('.chart-range[data-device="' + deviceId + '"]').forEach(function (b) {
    b.classList.remove("btn-secondary");
    b.classList.add("btn-outline-secondary");
  });

  btn.classList.remove("btn-outline-secondary");
  btn.classList.add("btn-secondary");

  await refreshChart(deviceId);
});

document.addEventListener("submit", async function (ev) {
  const form = ev.target;
  if (!form.classList.contains("ajax")) return;

  if (form.classList.contains("confirm-action")) {
    const message = form.getAttribute("data-confirm") || t("areYouSure", "Are you sure?");
    if (!window.confirm(message)) {
      ev.preventDefault();
      return;
    }
  }

  if (form.dataset.submitting === "1") {
    ev.preventDefault();
    return;
  }

  ev.preventDefault();
  form.dataset.submitting = "1";

  const deviceId = form.getAttribute("data-device");
  const isToggle = form.classList.contains("toggle");
  const toggleKey = form.getAttribute("data-what");

  const btn = form.querySelector('button[type="submit"]');
  setBusy(btn, true);

  let prevToggleValue = null;
  let nextToggleValue = null;
  let prevModeValue = null;
  let nextModeValue = null;

  const formData = new FormData(form);

  if (deviceId && formData.has("mode")) {
    prevModeValue = deviceTruth[deviceId] ? deviceTruth[deviceId].mode : null;
    nextModeValue = String(formData.get("mode") || "").toUpperCase();
    if (nextModeValue === "HEAT" || nextModeValue === "OFF") {
      setModeOptimistic(deviceId, nextModeValue, 8000);
      setModeUI(deviceId, nextModeValue);
    }
  }

  if (isToggle && deviceId && (toggleKey === "fan" || toggleKey === "light" || toggleKey === "amp")) {
    prevToggleValue = deviceTruth[deviceId] ? deviceTruth[deviceId][toggleKey] : null;
    nextToggleValue = prevToggleValue === null || prevToggleValue === undefined ? true : !prevToggleValue;

    setToggleUI(deviceId, toggleKey, nextToggleValue);
    setControlOptimistic(deviceId, toggleKey, nextToggleValue, 8000);
  }

  try {
    if (deviceId && formData.has("setpoint_c")) {
      setSetpointOptimistic(deviceId, formData.get("setpoint_c"), 8000);
    }

    if (isToggle && nextToggleValue !== null) {
      formData.set("on", nextToggleValue ? "1" : "0");
    }

    const r = await fetch(form.action, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    if (!r.ok) {
      if (deviceId && formData.has("mode")) {
        clearModeOptimistic(deviceId);
        if (prevModeValue) {
          setModeUI(deviceId, prevModeValue);
        }
      }
      if (deviceId && formData.has("setpoint_c")) {
        clearSetpointOptimistic(deviceId);
      }
      if (isToggle && deviceId && (toggleKey === "fan" || toggleKey === "light" || toggleKey === "amp")) {
        clearControlOptimistic(deviceId, toggleKey);
        setToggleUI(deviceId, toggleKey, prevToggleValue);
      }
      toast(tFormat("commandFailed", "Command failed (HTTP __STATUS__)", { status: r.status }), "danger");
      return;
    }

    toast(t("commandQueued", "Command queued"), "success");

    if (deviceId) await refreshDevice(deviceId);
  } catch (e) {
    if (deviceId && formData.has("mode")) {
      clearModeOptimistic(deviceId);
      if (prevModeValue) {
        setModeUI(deviceId, prevModeValue);
      }
    }
    if (deviceId && formData.has("setpoint_c")) {
      clearSetpointOptimistic(deviceId);
    }
    if (isToggle && deviceId && (toggleKey === "fan" || toggleKey === "light" || toggleKey === "amp")) {
      clearControlOptimistic(deviceId, toggleKey);
      setToggleUI(deviceId, toggleKey, prevToggleValue);
    }
    toast(t("networkError", "Network error"), "danger");
  } finally {
    delete form.dataset.submitting;
    setBusy(btn, false);
  }
});

document.addEventListener("input", function (e) {
  if (!e.target.matches('[id^="setpoint-range-"]')) return;

  const deviceId = e.target.id.replace("setpoint-range-", "");
  const valueDisplay = document.getElementById("setpoint-value-" + deviceId);
  if (valueDisplay) valueDisplay.textContent = e.target.value;

  setSetpointOptimistic(deviceId, e.target.value, 8000);

  if (setpointSubmitTimers[deviceId]) {
    clearTimeout(setpointSubmitTimers[deviceId]);
  }

  setpointSubmitTimers[deviceId] = setTimeout(function () {
    const form = e.target.closest("form.ajax");
    if (!form) return;
    if (form.dataset.submitting === "1") return;
    form.requestSubmit();
  }, 350);
});

document.addEventListener("change", function (e) {
  if (e.target.matches('input[type="radio"][name="mode"]')) {
    const form = e.target.closest("form.ajax");
    if (!form) return;

    const deviceId = form.getAttribute("data-device");
    if (deviceId) {
      setModeOptimistic(deviceId, e.target.value, 8000);
      setModeUI(deviceId, e.target.value);
    }

    if (form.dataset.submitting === "1") return;
    form.requestSubmit();
    return;
  }

  if (!e.target.matches('[id^="setpoint-range-"]')) return;

  const deviceId = e.target.id.replace("setpoint-range-", "");
  setSetpointOptimistic(deviceId, e.target.value, 8000);
  if (setpointSubmitTimers[deviceId]) {
    clearTimeout(setpointSubmitTimers[deviceId]);
    delete setpointSubmitTimers[deviceId];
  }

  const form = e.target.closest("form.ajax");
  if (!form) return;
  if (form.dataset.submitting === "1") return;
  form.requestSubmit();
});

initDeviceSelection();
refreshAll();
setInterval(refreshAll, 3000);
