# Modeling Details (ETA + Thermal)

This document contains implementation-level details extracted from firmware logic in `sauna-controller.yaml`.

It is intentionally more technical than `README.md`.

## Scope

Two online models are implemented:

- ETA heating-rate model: `rate = A + B * T_outdoor`
- Thermal model: `dTin/dt = a * P + c * (Tin - Tout)`

Both are updated in the 1-second main control loop, using gated sampling windows.

## ETA Model

### Objective

Estimate heating rate (degC/min) and predict time-to-setpoint.

### Core equations

- Predicted rate:

  ```text
  rate = A + B * Tout
  ```

- ETA:

  ```text
  eta_min = (setpoint - Tcontrol) / rate
  ```

### Learning conditions

ETA sample updates occur only when all conditions are true:

- Climate mode is `HEAT`
- `Tcontrol` and `Toutdoor` are valid
- Heater contactor is ON
- Sensor fault is not active
- At least 5 minutes elapsed since last ETA sample
- Observed slope is in range: `0.2 < rate_obs < 2.0` degC/min
- Current temperature is sufficiently below setpoint: `Tcontrol < setpoint - 5`

Observed slope:

```text
rate_obs = (T_now - T_prev) / delta_minutes
```

### Regression accumulators

Persisted accumulators:

- `n`
- `Sx`, `Sy`, `Sxx`, `Sxy`, `Syy`

Where:

- `x = Toutdoor`
- `y = rate_obs`

After `n >= 30`:

```text
den = n*Sxx - Sx*Sx
B = (n*Sxy - Sx*Sy) / den
A = (Sy - B*Sx) / n
```

### Clamping and smoothing

Raw fitted values are constrained:

- `A` in `[0.10, 5.00]`
- `B` in `[-0.05, 0.05]`

Then exponentially smoothed:

```text
A_est = 0.95*A_est + 0.05*A
B_est = 0.95*B_est + 0.05*B
```

### Confidence and RMSE

RMSE is computed from least-squares residual SSE with dof `(n - 2)`.

Confidence score combines:

- Data sufficiency (`n/300`, saturated to 1.0)
- Fit quality (RMSE mapped from best at <= 0.10 to poor at >= 0.50)

Weighted blend in firmware:

```text
confidence_pct = 100 * (0.55*data_score + 0.45*fit_score)
```

## Thermal Model

### Objective

Estimate cabin thermal parameters from runtime behavior.

Model form:

```text
dTin/dt = a*P + c*(Tin - Tout)
```

Derived quantities:

- `UA = -c/a` (W/degC)
- `C = 1/a` (J/degC), reported as kJ/degC
- `tau = -1/c` (s), reported as minutes

### Sampling and gating

Thermal samples are considered every >= 5 seconds when:

- Sensor fault is not active
- `Tcontrol` and `Toutdoor` are valid

Per sample:

- `P = heater_on ? (power_kW * 1000) : 0`
- `dT = Tin - Tout`
- `y = dTin/dt`

Skip near-static idle point:

- If `abs(y) < 0.02` and `P == 0`, ignore sample

Accept otherwise only when at least one is true:

- `y > 0.05`
- `y < -0.05`
- `abs(dT) > 1.0`

### Least-squares solve

Accumulated normal-equation terms:

- `S11 += P*P`
- `S22 += dT*dT`
- `S12 += P*dT`
- `T1  += P*y`
- `T2  += dT*y`

After `n >= 40`, solve:

```text
det = S11*S22 - S12*S12
a = (T1*S22 - T2*S12) / det
c = (S11*T2 - S12*T1) / det
```

Accepted parameter bounds:

- `0 < a < 1e-2`
- `-1e-2 < c < 0`

Then smoothed:

```text
a_est = 0.95*a_est + 0.05*a
c_est = 0.95*c_est + 0.05*c
```

## Learning Pause and Reset Behavior

When gating conditions are not met:

- ETA model resets only short-term slope state (`eta_last_ms`, `eta_last_t`)
- Thermal model resets only short-term slope state (`th_last_ms`, `th_last_tin`)
- Persisted accumulators and estimates remain available unless explicitly reset via maintenance button

## Operational Caveats

- Modeled power uses binary contactor state and configured nominal kW; there is no direct electrical power meter in the firmware.
- Both models are first-order approximations and may drift under strong disturbances (door opening, occupancy, ventilation changes).
- Early startup confidence is intentionally low until enough sample diversity is accumulated.
