# ESPHome Setup

ESPHome tooling is isolated in local virtual environment `esphome-venv/` and accessed through `esphome.sh`.

## Relevant Files

```text
esphome-venv/          # Python virtual environment for ESPHome
esphome.sh             # helper wrapper (activates venv + runs esphome)
sauna-controller.yaml  # main firmware config
secrets.yaml           # local secrets (do not commit)
```

## Daily Commands

```bash
# version
./esphome.sh version

# validate yaml
./esphome.sh config sauna-controller.yaml

# compile only
./esphome.sh compile sauna-controller.yaml

# compile + upload
./esphome.sh run sauna-controller.yaml

# optional dashboard
./esphome.sh dashboard .
```

## Manual Venv Use (Optional)

```bash
source esphome-venv/bin/activate
esphome version
deactivate
```

## Recreate ESPHome Environment

If `esphome-venv/` is missing or corrupted:

```bash
python3.11 -m venv esphome-venv
source esphome-venv/bin/activate
pip install --upgrade pip
pip install esphome
deactivate
```

## secrets.yaml Minimum Keys

```yaml
api_key: "..."
ota_password: "..."
wifi_ssid: "..."
wifi_password: "..."
mqtt_host: "..."
mqtt_port: "8883"
mqtt_username: "..."
mqtt_password: "..."
mqtt_ca_cert: |
  -----BEGIN CERTIFICATE-----
  ...
  -----END CERTIFICATE-----
```

`secrets.yaml` stays local and must not be committed.

## Notes

- Build artifacts are generated under `.esphome/` during compile and can be safely removed when cleaning disk space.
- Current project keeps a single ESPHome env: `esphome-venv/`.
