import json
import logging

from django.conf import settings
from django.utils import timezone

from paho.mqtt import publish

from .models import Command, Device, Telemetry

logger = logging.getLogger(__name__)


def _mqtt_auth():
    if settings.MQTT_USERNAME:
        return {
            "username": settings.MQTT_USERNAME,
            "password": settings.MQTT_PASSWORD,
        }
    return None


def _mqtt_tls():
    if not settings.MQTT_TLS_ENABLED:
        return None

    tls = {
        "cert_reqs": 2,
        "insecure": settings.MQTT_TLS_INSECURE,
    }
    if settings.MQTT_TLS_CA_CERT:
        tls["ca_certs"] = settings.MQTT_TLS_CA_CERT
    return tls


def mqtt_enabled() -> bool:
    return bool(getattr(settings, "MQTT_ENABLED", False))


def command_topic_for_device(device_id: str) -> str:
    return settings.MQTT_COMMAND_TOPIC_TEMPLATE.format(device_id=device_id)


def publish_command(command: Command) -> None:
    if not mqtt_enabled():
        return

    topic = command_topic_for_device(command.device.device_id)
    payload = {
        "cmd_id": command.id,
        "type": command.cmd_type,
        "payload": command.payload,
        "ts": int(timezone.now().timestamp()),
    }

    publish.single(
        topic=topic,
        payload=json.dumps(payload, separators=(",", ":")),
        hostname=settings.MQTT_HOST,
        port=settings.MQTT_PORT,
        auth=_mqtt_auth(),
        tls=_mqtt_tls(),
        qos=settings.MQTT_COMMAND_QOS,
        retain=False,
    )


def ingest_telemetry_payload(raw_payload: bytes) -> None:
    try:
        data = json.loads(raw_payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.warning("Ignoring invalid telemetry JSON payload")
        return

    device_id = data.get("device_id")
    if not device_id:
        logger.warning("Ignoring telemetry without device_id")
        return

    try:
        dev = Device.objects.get(device_id=device_id)
    except Device.DoesNotExist:
        logger.warning("Ignoring telemetry for unknown device_id=%s", device_id)
        return

    now = timezone.now()
    Telemetry.objects.create(device=dev, ts=now, payload=data)

    ack_raw = data.get("last_ack_id", 0)
    try:
        ack_id = int(ack_raw)
    except (TypeError, ValueError):
        ack_id = 0

    if ack_id > 0:
        Command.objects.filter(
            device=dev,
            status=Command.STATUS_PENDING,
            id__lte=ack_id,
        ).update(status=Command.STATUS_ACKED, acked_at=now)

    # Keep online status logic unchanged and persist latest ACK marker.
    update_fields = ["last_seen"]
    dev.last_seen = now
    if ack_id > dev.last_ack_id:
        dev.last_ack_id = ack_id
        update_fields.append("last_ack_id")
    dev.save(update_fields=update_fields)
