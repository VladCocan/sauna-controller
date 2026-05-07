# Sauna Control System

Sauna controller stack with:
- ESPHome firmware (`sauna-controller.yaml`)
- Django web UI + command API
- Mosquitto broker
- MQTT worker for telemetry ingest and command ACK reconciliation

## Architecture

- Device transport: MQTT only
- Telemetry flow: ESP -> MQTT -> `sauna_mqtt_worker` -> PostgreSQL
- Command flow: Django UI -> `Command` rows -> MQTT publish -> ESP -> ACK via telemetry `last_ack_id`
- Legacy HTTP device endpoints are removed.

## Runtime Services

- `sauna_db` (PostgreSQL)
- `sauna_mqtt` (Mosquitto)
- `sauna_web` (Django + gunicorn)
- `sauna_mqtt_worker` (Django management command `mqtt_bridge`)

Check status:

```bash
docker compose ps
```

## MQTT Topics

- Telemetry: `sauna/<device_id>/telemetry`
- Commands: `sauna/<device_id>/cmd`
- Device state: `sauna/<device_id>/state`

Current controller example:

- `sauna/sauna-controller/telemetry`
- `sauna/sauna-controller/cmd`

## Security

- Public MQTT listener: TLS on `8883`
- Internal listener (Docker network): `1883` (not publicly exposed)
- MQTT auth required (username/password)
- ESP validates broker cert using `mqtt_ca_cert` from `secrets.yaml`

## Quick Start

1. Configure `.env` (DB + Django + MQTT credentials).
2. Configure `secrets.yaml` (Wi-Fi, OTA/API keys, MQTT credentials, `mqtt_ca_cert`).
3. Sync broker cert/key from Caddy:

```bash
sudo ./mqtt/sync_caddy_cert.sh sauna.sysio.cloud
```

4. Build and start stack:

```bash
docker compose up -d --build
```

5. Verify services and logs:

```bash
docker compose ps
docker compose logs --tail=100 web mqtt mqtt_worker
```

## ESPHome

Use helper script backed by `esphome-venv/`:

```bash
./esphome.sh config sauna-controller.yaml
./esphome.sh compile sauna-controller.yaml
# optional flash
./esphome.sh run sauna-controller.yaml
```

## Project Layout

- `sauna-controller.yaml` firmware
- `docker-compose.yml` services
- `web/` Django app
- `mqtt/` broker config/certs/scripts
- `esphome.sh`, `esphome-venv/` ESPHome tooling
- `DEPLOYMENT.md` production/TLS checklist
- `ESPHOME_SETUP.md` ESPHome environment details
