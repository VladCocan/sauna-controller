# Deployment Checklist (MQTT + TLS)

## 1. Prepare Secrets and Environment

Set consistent MQTT credentials in:
- `.env`: `MQTT_USERNAME`, `MQTT_PASSWORD`
- `secrets.yaml`: `mqtt_username`, `mqtt_password`
- `mqtt/config/passwd`

Update broker password file:

```bash
docker run --rm -v "$PWD/mqtt/config:/mosquitto/config" eclipse-mosquitto:2 \
  sh -c 'mosquitto_passwd -b /mosquitto/config/passwd sauna_mqtt "YOUR_PASSWORD"'
```

## 2. Sync TLS Cert to Mosquitto

```bash
sudo ./mqtt/sync_caddy_cert.sh sauna.sysio.cloud
```

This updates:
- `mqtt/certs/server.crt`
- `mqtt/certs/server.key`

## 3. Validate ESP Trust Anchor

In `secrets.yaml`, `mqtt_ca_cert` should contain a CA trust anchor used to validate the broker certificate chain.

Recommendation:
- use the root CA certificate (for example ISRG Root X1)
- avoid using only short-lived/intermediate cert snippets that may rotate

## 4. Build and Start Stack

```bash
docker compose up -d --build
```

## 5. Verify Broker Listeners

```bash
docker compose logs --tail=120 mqtt
```

Expected:
- listener `1883` active (internal Docker network)
- listener `8883` active (TLS/public)

## 6. Verify Web + Worker Health

```bash
docker compose ps
docker compose logs --tail=120 web mqtt_worker
```

## 7. Verify Firmware Config/Build

```bash
./esphome.sh config sauna-controller.yaml
./esphome.sh compile sauna-controller.yaml
```

## 8. Verify Django Side

```bash
docker compose exec -T web python manage.py test core
```

## 9. Certificate Rotation Procedure

When TLS cert changes:

```bash
sudo ./mqtt/sync_caddy_cert.sh sauna.sysio.cloud
docker compose restart mqtt
```

If CA trust material also changed, update `mqtt_ca_cert` in `secrets.yaml` and redeploy firmware.
