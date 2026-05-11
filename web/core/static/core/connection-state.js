/**
 * Connection State Manager
 * 
 * Centralized connection state tracking for the Sauna PWA.
 * 
 * States:
 *   ONLINE     - Receiving recent telemetry updates
 *   CONNECTING - Attempting to reconnect or waiting for data
 *   OFFLINE    - No updates for configurable timeout
 *   ERROR      - Request failed or API error
 * 
 * Architecture:
 *   - Per-device state tracking
 *   - Configurable stale timeout
 *   - Exponential backoff reconnection
 *   - Heartbeat detection
 *   - Request-level state management
 */

const ConnectionState = (function () {
  'use strict';

  // State constants
  const STATE = {
    ONLINE: 'ONLINE',
    CONNECTING: 'CONNECTING',
    OFFLINE: 'OFFLINE',
    ERROR: 'ERROR',
  };

  // Configuration
  const CONFIG = {
    STALE_TIMEOUT_MS: 15000,        // 15s before marking stale
    RECONNECT_BASE_MS: 2000,        // 2s base reconnect delay
    RECONNECT_MAX_MS: 30000,        // max 30s reconnect delay
    REQUEST_TIMEOUT_MS: 12000,      // Request timeout
    UPDATE_CHECK_INTERVAL_MS: 500,  // How often to check if data is stale
  };

  // Global device states
  const deviceStates = {};
  const requestStates = {};
  const stateUpdateListeners = {};
  const lastUpdateListeners = {};
  
  // Timers
  const staleCheckTimers = {};
  const updateTickTimers = {};

  /**
   * Get or initialize state for a device
   */
  function initDevice(deviceId) {
    if (!deviceStates[deviceId]) {
      deviceStates[deviceId] = {
        state: STATE.CONNECTING,
        lastHeartbeatMs: Date.now(),
        staleTimeoutMs: CONFIG.STALE_TIMEOUT_MS,
        reconnectBackoffMs: CONFIG.RECONNECT_BASE_MS,
        reconnectAttempts: 0,
        lastError: null,
      };
      requestStates[deviceId] = {};
      stateUpdateListeners[deviceId] = [];
      lastUpdateListeners[deviceId] = [];
      startStaleCheck(deviceId);
      startUpdateTick(deviceId);
    }
    return deviceStates[deviceId];
  }

  /**
   * Update heartbeat timestamp and mark as ONLINE
   */
  function recordHeartbeat(deviceId) {
    const state = initDevice(deviceId);
    const oldState = state.state;
    state.lastHeartbeatMs = Date.now();
    state.reconnectAttempts = 0;
    state.reconnectBackoffMs = CONFIG.RECONNECT_BASE_MS;
    state.lastError = null;
    
    if (oldState !== STATE.ONLINE) {
      setState(deviceId, STATE.ONLINE);
    }
    
    notifyLastUpdate(deviceId);
  }

  /**
   * Set connection state and notify listeners
   */
  function setState(deviceId, newState) {
    const state = initDevice(deviceId);
    if (state.state === newState) return;
    
    state.state = newState;
    state.lastError = null;
    notifyStateChange(deviceId, newState);
  }

  /**
   * Mark device as in error state
   */
  function setError(deviceId, errorMsg) {
    const state = initDevice(deviceId);
    state.state = STATE.ERROR;
    state.lastError = errorMsg;
    notifyStateChange(deviceId, STATE.ERROR);
  }

  /**
   * Mark device as CONNECTING (attempting reconnect)
   */
  function setConnecting(deviceId) {
    const state = initDevice(deviceId);
    if (state.state !== STATE.OFFLINE && state.state !== STATE.ERROR) return;
    setState(deviceId, STATE.CONNECTING);
  }

  /**
   * Get current connection state
   */
  function getState(deviceId) {
    const state = deviceStates[deviceId];
    return state ? state.state : STATE.OFFLINE;
  }

  /**
   * Get milliseconds since last update
   */
  function getTimeSinceLastUpdate(deviceId) {
    const state = deviceStates[deviceId];
    if (!state) return Infinity;
    return Date.now() - state.lastHeartbeatMs;
  }

  /**
   * Format time since last update into human-readable string
   * e.g., "Updated just now", "Updated 5s ago", "Updated 1m ago"
   */
  function formatLastUpdate(deviceId) {
    const ms = getTimeSinceLastUpdate(deviceId);
    if (ms < 2000) return 'Updated just now';
    if (ms < 60000) return 'Updated ' + Math.round(ms / 1000) + 's ago';
    if (ms < 3600000) return 'Updated ' + Math.round(ms / 60000) + 'm ago';
    return 'Updated ' + Math.round(ms / 3600000) + 'h ago';
  }

  /**
   * Check if device is stale (no updates for timeout period)
   */
  function isStale(deviceId) {
    const state = deviceStates[deviceId];
    if (!state) return true;
    return getTimeSinceLastUpdate(deviceId) > state.staleTimeoutMs;
  }

  /**
   * Get next reconnect delay (exponential backoff)
   */
  function getNextReconnectDelay(deviceId) {
    const state = deviceStates[deviceId];
    if (!state) return CONFIG.RECONNECT_BASE_MS;
    
    const backoff = Math.min(
      CONFIG.RECONNECT_BASE_MS * Math.pow(1.5, state.reconnectAttempts),
      CONFIG.RECONNECT_MAX_MS
    );
    return Math.floor(backoff + Math.random() * 1000); // Add jitter
  }

  /**
   * Record reconnect attempt
   */
  function recordReconnectAttempt(deviceId) {
    const state = initDevice(deviceId);
    state.reconnectAttempts++;
    state.reconnectBackoffMs = getNextReconnectDelay(deviceId);
  }

  /**
   * Check for stale data and update state accordingly
   */
  function startStaleCheck(deviceId) {
    if (staleCheckTimers[deviceId]) return;
    
    staleCheckTimers[deviceId] = setInterval(function () {
      const state = deviceStates[deviceId];
      if (!state) return;
      
      if (state.state === STATE.ONLINE && isStale(deviceId)) {
        setState(deviceId, STATE.OFFLINE);
      }
    }, 1000);
  }

  /**
   * Periodic tick to update last-update displays
   */
  function startUpdateTick(deviceId) {
    if (updateTickTimers[deviceId]) return;
    
    updateTickTimers[deviceId] = setInterval(function () {
      notifyLastUpdate(deviceId);
    }, CONFIG.UPDATE_CHECK_INTERVAL_MS);
  }

  /**
   * Stop timers for a device
   */
  function stopTimers(deviceId) {
    if (staleCheckTimers[deviceId]) {
      clearInterval(staleCheckTimers[deviceId]);
      delete staleCheckTimers[deviceId];
    }
    if (updateTickTimers[deviceId]) {
      clearInterval(updateTickTimers[deviceId]);
      delete updateTickTimers[deviceId];
    }
  }

  /**
   * Register listener for state changes
   * Callback signature: function(deviceId, newState, oldState)
   */
  function onStateChange(deviceId, callback) {
    if (!stateUpdateListeners[deviceId]) {
      stateUpdateListeners[deviceId] = [];
    }
    stateUpdateListeners[deviceId].push(callback);
    
    return function unsubscribe() {
      const idx = stateUpdateListeners[deviceId].indexOf(callback);
      if (idx >= 0) stateUpdateListeners[deviceId].splice(idx, 1);
    };
  }

  /**
   * Register listener for last-update changes
   * Callback signature: function(deviceId, formattedTime)
   */
  function onLastUpdateChange(deviceId, callback) {
    if (!lastUpdateListeners[deviceId]) {
      lastUpdateListeners[deviceId] = [];
    }
    lastUpdateListeners[deviceId].push(callback);
    
    return function unsubscribe() {
      const idx = lastUpdateListeners[deviceId].indexOf(callback);
      if (idx >= 0) lastUpdateListeners[deviceId].splice(idx, 1);
    };
  }

  /**
   * Notify state change listeners
   */
  function notifyStateChange(deviceId, newState) {
    const listeners = stateUpdateListeners[deviceId] || [];
    listeners.forEach(function (cb) {
      try {
        cb(deviceId, newState);
      } catch (e) {
        console.error('State change listener error:', e);
      }
    });
  }

  /**
   * Notify last-update listeners
   */
  function notifyLastUpdate(deviceId) {
    const listeners = lastUpdateListeners[deviceId] || [];
    const formatted = formatLastUpdate(deviceId);
    listeners.forEach(function (cb) {
      try {
        cb(deviceId, formatted);
      } catch (e) {
        console.error('Last update listener error:', e);
      }
    });
  }

  /**
   * Request state: track pending requests to prevent duplicates
   */
  function startRequest(deviceId, requestId) {
    if (!requestStates[deviceId]) {
      requestStates[deviceId] = {};
    }
    requestStates[deviceId][requestId] = {
      startMs: Date.now(),
      state: 'pending',
    };
  }

  /**
   * Mark request as completed
   */
  function completeRequest(deviceId, requestId, success, errorMsg) {
    if (!requestStates[deviceId] || !requestStates[deviceId][requestId]) return;
    
    const req = requestStates[deviceId][requestId];
    req.state = success ? 'success' : 'error';
    req.errorMsg = errorMsg || null;
    req.durationMs = Date.now() - req.startMs;
    
    // Keep for 2s then clean up
    setTimeout(function () {
      if (requestStates[deviceId]) {
        delete requestStates[deviceId][requestId];
      }
    }, 2000);
  }

  /**
   * Check if a request is pending
   */
  function isRequestPending(deviceId, requestId) {
    const req = requestStates[deviceId] && requestStates[deviceId][requestId];
    return req && req.state === 'pending';
  }

  /**
   * Get count of pending requests
   */
  function getPendingRequestCount(deviceId) {
    const requests = requestStates[deviceId] || {};
    return Object.keys(requests).filter(function (id) {
      return requests[id].state === 'pending';
    }).length;
  }

  /**
   * Cleanup: destroy device state
   */
  function destroy(deviceId) {
    stopTimers(deviceId);
    delete deviceStates[deviceId];
    delete requestStates[deviceId];
    delete stateUpdateListeners[deviceId];
    delete lastUpdateListeners[deviceId];
  }

  // Public API
  return {
    STATE: STATE,
    CONFIG: CONFIG,
    
    initDevice: initDevice,
    recordHeartbeat: recordHeartbeat,
    setState: setState,
    setError: setError,
    setConnecting: setConnecting,
    getState: getState,
    
    getTimeSinceLastUpdate: getTimeSinceLastUpdate,
    formatLastUpdate: formatLastUpdate,
    isStale: isStale,
    
    getNextReconnectDelay: getNextReconnectDelay,
    recordReconnectAttempt: recordReconnectAttempt,
    
    onStateChange: onStateChange,
    onLastUpdateChange: onLastUpdateChange,
    
    startRequest: startRequest,
    completeRequest: completeRequest,
    isRequestPending: isRequestPending,
    getPendingRequestCount: getPendingRequestCount,
    
    destroy: destroy,
  };
})();
