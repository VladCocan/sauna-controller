#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-sauna.sysio.cloud}"
CADDY_CERT_DIR="/var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory/${DOMAIN}"
TARGET_DIR="$(cd "$(dirname "$0")" && pwd)/certs"

if [[ ! -f "${CADDY_CERT_DIR}/${DOMAIN}.crt" || ! -f "${CADDY_CERT_DIR}/${DOMAIN}.key" ]]; then
  echo "Missing Caddy certificate files for ${DOMAIN} in ${CADDY_CERT_DIR}" >&2
  exit 1
fi

install -d -m 0755 "${TARGET_DIR}"
install -m 0644 "${CADDY_CERT_DIR}/${DOMAIN}.crt" "${TARGET_DIR}/server.crt"
install -m 0640 "${CADDY_CERT_DIR}/${DOMAIN}.key" "${TARGET_DIR}/server.key"

# Mosquitto in container runs as uid/gid 1883.
chown 1883:1883 "${TARGET_DIR}/server.crt" "${TARGET_DIR}/server.key"

echo "Synced certificate for ${DOMAIN} to ${TARGET_DIR}"
