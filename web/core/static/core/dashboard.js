// ---------- Helpers ----------
async function getJSON(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 12000);
  try {
    const r = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function isIosStandalonePwa() {
  const ua = window.navigator.userAgent || "";
  const iDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadDesktopMode = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  return standalone && (iDevice || iPadDesktopMode);
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

function formatTemperature(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toFixed(1);
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
  const previousDeviceId = localStorage.getItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, deviceId);
  if (previousDeviceId !== deviceId) {
    document.dispatchEvent(new CustomEvent("deviceSelected", { detail: { deviceId: deviceId } }));
  }

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
const pendingCommands = {};
const COMMAND_DEBOUNCE_MS = 600;

function rememberPendingCommand(deviceId, commandId, label) {
  const id = Number(commandId);
  if (!deviceId || !Number.isFinite(id) || id <= 0) return;
  if (!pendingCommands[deviceId]) pendingCommands[deviceId] = {};
  pendingCommands[deviceId][id] = { label: label || "command", ts: Date.now() };
  renderPendingCommands(deviceId);
}

function acknowledgeCommands(deviceId, ackId) {
  const ack = Number(ackId);
  if (!deviceId || !Number.isFinite(ack) || ack <= 0 || !pendingCommands[deviceId]) return;

  let changed = false;
  Object.keys(pendingCommands[deviceId]).forEach(function (id) {
    if (Number(id) <= ack) {
      delete pendingCommands[deviceId][id];
      changed = true;
    }
  });

  if (Object.keys(pendingCommands[deviceId]).length === 0) delete pendingCommands[deviceId];
  if (changed) {
    renderPendingCommands(deviceId);
    toast(t("commandApplied", "Command applied"), "success");
  }
}

function renderPendingCommands(deviceId) {
  const el = document.getElementById("cmds-" + deviceId);
  if (!el) return;
  const cmds = pendingCommands[deviceId] || {};
  const ids = Object.keys(cmds).sort(function (a, b) { return Number(a) - Number(b); });
  if (!ids.length) {
    el.textContent = "[]";
    return;
  }
  el.textContent = JSON.stringify(ids.map(function (id) {
    return { id: Number(id), label: cmds[id].label, pending_ms: Date.now() - cmds[id].ts };
  }), null, 2);
}

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

function renderHeaterMode(deviceId, requestedMode, status) {
  const modeEl = document.getElementById("mode-" + deviceId);
  if (!modeEl) return;

  const s = status || {};
  const requested = String(requestedMode || s.mode || "OFF").toUpperCase() === "HEAT" ? "HEAT" : "OFF";
  const contactor = s.contactor_active;
  const heaterPct = Number(s.heater_power_pct || 0);
  const actualOn = contactor === true || heaterPct > 0;

  let badgeClass = "text-bg-secondary";
  let label = "OFF";

  if (actualOn) {
    badgeClass = "text-bg-success";
    label = "ON";
  } else if (requested === "HEAT") {
    badgeClass = "text-bg-warning";
    label = "HEAT pending";
  }

  const contactorLabel = contactor === true ? "Contactor ON" : (contactor === false ? "Contactor OFF" : "Contactor —");
  modeEl.innerHTML = '<span class="badge ' + badgeClass + '">' + label + '</span>' +
    '<div class="small text-muted mt-1">Mode: ' + requested + ' · ' + contactorLabel + '</div>';
}

async function refreshDevice(deviceId) {
  try {
    const st = await getJSON("/api/device_status?device_id=" + encodeURIComponent(deviceId));
    const s = st.status || {};

    // Update connection state manager
    if (st.online) {
      ConnectionState.recordHeartbeat(deviceId);
    } else {
      ConnectionState.setState(deviceId, ConnectionState.STATE.OFFLINE);
    }

    setOnlineBadge(deviceId, !!st.online);
    setText("online-status-" + deviceId, st.online ? t("online", "ONLINE") : t("offline", "OFFLINE"));
    setText("last-ack-" + deviceId, st.last_ack_id);
    acknowledgeCommands(deviceId, st.last_ack_id);
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

    renderHeaterMode(deviceId, mode, s);

    const effectiveSetpoint = getEffectiveSetpoint(deviceId, s.setpoint_c);

    setText("sp-" + deviceId, formatTemperature(effectiveSetpoint));
    setText("ttop-" + deviceId, formatTemperature(s.t_top_c));
    setText("thead-" + deviceId, formatTemperature(s.t_head_c));
    setText("tunder-" + deviceId, formatTemperature(s.t_under_c));
    setText("outdoor-temp-" + deviceId, formatTemperature(s.t_outdoor_c));
    setText("control-temp-value-" + deviceId, formatTemperature(s.t_control));
    setText("control-temp-source-" + deviceId, firstAvailable(s, ["control_temp_source_active", "control_temp_source"]));
    setText("control-temp-valid-" + deviceId, s.control_temp_valid);
    setText("control-strat-delta-" + deviceId, formatTemperature(s.strat_delta_c));
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

    renderPendingCommands(deviceId);
  } catch (e) {
    ConnectionState.setError(deviceId, String(e.message || e));
    setOnlineBadge(deviceId, false);
    setText("online-status-" + deviceId, t("offline", "OFFLINE"));
  }

  try {
    await refreshChart(deviceId);
  } catch (e) {
    // Ignore chart fetch errors without breaking the page.
  }
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

  // Check connection state before allowing submission
  const deviceId = form.getAttribute("data-device");
  if (deviceId && ConnectionState.getState(deviceId) === ConnectionState.STATE.OFFLINE) {
    ev.preventDefault();
    toast(t("deviceOffline", "Device is offline"), "danger");
    return;
  }

  if (form.dataset.submitting === "1") {
    ev.preventDefault();
    return;
  }

  const nowMs = Date.now();
  const lastSubmitMs = Number(form.dataset.lastSubmitMs || 0);
  if (nowMs - lastSubmitMs < COMMAND_DEBOUNCE_MS) {
    ev.preventDefault();
    return;
  }
  form.dataset.lastSubmitMs = String(nowMs);

  ev.preventDefault();
  form.dataset.submitting = "1";

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

    const csrfInput = form.querySelector('input[name="csrfmiddlewaretoken"]');
    const headers = {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (csrfInput && csrfInput.value) {
      headers["X-CSRFToken"] = csrfInput.value;
    }

    // Track request state
    const requestId = "req-" + Date.now() + "-" + Math.random();
    if (deviceId) ConnectionState.startRequest(deviceId, requestId);

    const r = await fetch(form.action, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      cache: "no-store",
      headers: headers,
    });

    if (!r.ok) {
      if (deviceId) ConnectionState.completeRequest(deviceId, requestId, false, "HTTP " + r.status);
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

    let responseData = {};
    try { responseData = await r.json(); } catch (_) {}

    if (deviceId) ConnectionState.completeRequest(deviceId, requestId, true);

    if (deviceId && responseData.command_id) {
      rememberPendingCommand(deviceId, responseData.command_id, formData.get("what") || formData.get("mode") || formData.get("key") || "command");
      toast(t("commandQueued", "Command queued"), "primary");
    } else {
      toast(t("commandQueued", "Command queued"), "primary");
    }

    // UI already changed optimistically; SSE will confirm via last_ack_id.
    if (deviceId) setTimeout(function () { renderPendingCommands(deviceId); }, 1000);
  } catch (e) {
    if (deviceId) ConnectionState.completeRequest(deviceId, requestId, false, String(e.message || e));
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

let _polling = false;

async function refreshAll() {
  if (_polling) return;
  _polling = true;
  try {
    const devices = getAllDeviceIds();
    if (!devices.length) return;
    const selected = localStorage.getItem(STORAGE_KEY) || devices[0];
    await refreshDevice(selected);
  } finally {
    _polling = false;
  }
}

let _es = null;
let _sseHealthy = false;
let _sseReconnectTimer = null;

function scheduleSseReconnect(deviceId) {
  if (_sseReconnectTimer) return;
  _sseReconnectTimer = setTimeout(function () {
    _sseReconnectTimer = null;
    if (!document.hidden && deviceId) {
      connectSSE(deviceId);
      refreshDevice(deviceId);
    }
  }, isIosStandalonePwa() ? 5000 : 3000);
}

function connectSSE(deviceId) {
  if (_es) {
    _es.close();
    _es = null;
  }
  ConnectionState.setConnecting(deviceId);
  _sseHealthy = false;
  const es = new EventSource(`/sse/${encodeURIComponent(deviceId)}/`);

  function handleTelemetryEvent(e) {
  try {
    const payload = JSON.parse(e.data);
    const s = payload.status || {};

    // Record heartbeat in connection state manager
    ConnectionState.recordHeartbeat(deviceId);
    _sseHealthy = true;
    setOnlineBadge(deviceId, true);
    setText("online-status-" + deviceId, t("online", "ONLINE"));
    setText("last-ack-" + deviceId, payload.last_ack_id || "");
    setText("lastseen-" + deviceId, new Date().toLocaleString());
    acknowledgeCommands(deviceId, payload.last_ack_id);

    const mode = getEffectiveMode(deviceId, s.mode);
    const fanOn = getEffectiveControl(deviceId, "fan", s.fan_on);
    const lightOn = getEffectiveControl(deviceId, "light", s.light_on);
    const ampOn = getEffectiveControl(deviceId, "amp", s.amp_on);

    deviceTruth[deviceId] = { mode: mode, fan: fanOn, light: lightOn, amp: ampOn };

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

    renderHeaterMode(deviceId, mode, s);

    const effectiveSetpoint = getEffectiveSetpoint(deviceId, s.setpoint_c);
    setText("sp-" + deviceId, formatTemperature(effectiveSetpoint));
    setText("ttop-" + deviceId, formatTemperature(s.t_top_c));
    setText("thead-" + deviceId, formatTemperature(s.t_head_c));
    setText("tunder-" + deviceId, formatTemperature(s.t_under_c));
    setText("outdoor-temp-" + deviceId, formatTemperature(s.t_outdoor_c));
    setText("control-temp-value-" + deviceId, formatTemperature(s.t_control));
    setText("control-temp-source-" + deviceId, firstAvailable(s, ["control_temp_source_active", "control_temp_source"]));
    setText("control-temp-valid-" + deviceId, s.control_temp_valid);
    setText("control-strat-delta-" + deviceId, formatTemperature(s.strat_delta_c));
    const etaToSetpointMin = firstAvailable(s, ["eta_auto_min", "eta_pred_min"]);
    setText("eta-setpoint-" + deviceId, formatEtaMinutes(etaToSetpointMin));

    setToggleUI(deviceId, "fan", fanOn);
    setToggleUI(deviceId, "light", lightOn);
    setToggleUI(deviceId, "amp", ampOn);

    if (mode) setModeUI(deviceId, mode);

    const setpointRange = document.getElementById("setpoint-range-" + deviceId);
    const setpointValue = document.getElementById("setpoint-value-" + deviceId);
    if (setpointRange && effectiveSetpoint !== undefined && effectiveSetpoint !== null) {
      if (document.activeElement !== setpointRange) setpointRange.value = effectiveSetpoint;
      if (setpointValue) setpointValue.textContent = effectiveSetpoint;
    }

    syncDiagnosticControls(deviceId, s);
    renderDiagnostics(deviceId, s);
    renderPendingCommands(deviceId);
  } catch (_) {}
  }

  es.addEventListener("telemetry", handleTelemetryEvent);
  es.onmessage = handleTelemetryEvent;
  es.addEventListener("ping", function () {
    _sseHealthy = true;
    ConnectionState.recordHeartbeat(deviceId);
    setOnlineBadge(deviceId, true);
  });
  es.onopen = function () {
    _sseHealthy = true;
    ConnectionState.recordHeartbeat(deviceId);
  };
  es.onerror = function () {
    _sseHealthy = false;
    ConnectionState.setError(deviceId, 'SSE connection failed');
    setOnlineBadge(deviceId, false);
    setText("online-status-" + deviceId, t("offline", "OFFLINE"));
    try { es.close(); } catch (_) {}
    if (_es === es) _es = null;
    scheduleSseReconnect(deviceId);
  };
  _es = es;
  return es;
}

initDeviceSelection();

const _initialDevice = getAllDeviceIds()[0];
if (_initialDevice) {
  const _selected = localStorage.getItem(STORAGE_KEY) || _initialDevice;
  connectSSE(_selected);
  refreshDevice(_selected); // primul load complet
}

document.addEventListener("deviceSelected", (e) => {
  connectSSE(e.detail.deviceId);
  refreshDevice(e.detail.deviceId);
});

// Poll lent pe desktop; poll mai agresiv pe iOS PWA sau când SSE nu e sănătos.
setInterval(() => {
  const selected = localStorage.getItem(STORAGE_KEY) || getAllDeviceIds()[0];
  if (!selected || document.hidden) return;

  // On iOS installed PWAs, SSE can silently stall. Use HTTP polling as the
  // primary safety net there; on desktop keep the original slow poll cadence.
  if (isIosStandalonePwa() || !_sseHealthy) {
    refreshDevice(selected);
  }
}, isIosStandalonePwa() ? 5000 : 30000);

window.addEventListener("pageshow", function () {
  const selected = localStorage.getItem(STORAGE_KEY) || getAllDeviceIds()[0];
  if (!selected) return;
  connectSSE(selected);
  refreshDevice(selected);
});

document.addEventListener("visibilitychange", function () {
  const selected = localStorage.getItem(STORAGE_KEY) || getAllDeviceIds()[0];
  if (!selected || document.hidden) return;
  connectSSE(selected);
  refreshDevice(selected);
});

// Initialize connection state UI for all devices
getAllDeviceIds().forEach(function (deviceId) {
  ConnectionState.initDevice(deviceId);
  
  // Listen for connection state changes and update UI
  ConnectionState.onStateChange(deviceId, function (devId, newState) {
    updateConnectionStatusUI(devId, newState);
  });
  
  // Listen for last-update changes and update UI
  ConnectionState.onLastUpdateChange(deviceId, function (devId, formattedTime) {
    updateLastUpdateUI(devId, formattedTime);
  });
});

/**
 * Update the connection status indicator in the UI
 */
function updateConnectionStatusUI(deviceId, state) {
  const dot = document.getElementById("conn-dot-" + deviceId);
  const label = document.getElementById("conn-label-" + deviceId);
  const bar = document.getElementById("conn-bar-" + deviceId);
  
  if (!dot || !label || !bar) return;
  
  // Remove all state classes
  dot.classList.remove("online", "connecting", "offline", "error");
  
  // Apply state-specific styling
  const stateColor = {
    [ConnectionState.STATE.ONLINE]: { color: "success", label: t("online", "ONLINE"), class: "online" },
    [ConnectionState.STATE.CONNECTING]: { color: "warning", label: t("connecting", "CONNECTING"), class: "connecting" },
    [ConnectionState.STATE.OFFLINE]: { color: "danger", label: t("offline", "OFFLINE"), class: "offline" },
    [ConnectionState.STATE.ERROR]: { color: "danger", label: t("error", "ERROR"), class: "error" },
  };
  
  const config = stateColor[state] || stateColor[ConnectionState.STATE.OFFLINE];
  dot.classList.add(config.class);
  label.textContent = config.label;
  
  // Add offline class to card for disabling controls
  const card = document.querySelector('.device-view[data-device="' + deviceId + '"] .sauna-card');
  if (card) {
    if (state === ConnectionState.STATE.OFFLINE) {
      card.classList.add("sauna-offline");
    } else {
      card.classList.remove("sauna-offline");
    }
  }
}

/**
 * Update the last-update indicator in the UI
 */
function updateLastUpdateUI(deviceId, formattedTime) {
  const el = document.getElementById("last-update-" + deviceId);
  if (!el) return;
  el.textContent = formattedTime;
}