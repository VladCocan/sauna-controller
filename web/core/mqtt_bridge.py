import json
import logging
import threading

import paho.mqtt.client as mqtt
from django.conf import settings
from django.utils import timezone

from .models import Command, Device, Telemetry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level persistent client (only alive inside the mqtt_worker process).
# Web/gunicorn workers must NOT call _get_client() — they use publish_command()
# which falls back to single() when the persistent client is unavailable.
# ---------------------------------------------------------------------------
_client: mqtt.Client | None = None
_client_lock = threading.Lock()
_client_connected = threading.Event()


def _build_client(client_id: str = "sauna-mqtt-bridge") -> mqtt.Client:
    client = mqtt.Client(client_id=client_id)
    if settings.MQTT_USERNAME:
        client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
    if settings.MQTT_TLS_ENABLED:
        ca_certs = settings.MQTT_TLS_CA_CERT or None
        client.tls_set(ca_certs=ca_certs)
        client.tls_insecure_set(settings.MQTT_TLS_INSECURE)
    return client


def register_persistent_client(client: mqtt.Client) -> None:
    """Called once by the mqtt_bridge management command after connect."""
    global _client
    with _client_lock:
        _client = client
    _client_connected.set()
    logger.info("Persistent MQTT client registered for publish reuse.")


def mqtt_enabled() -> bool:
    return bool(getattr(settings, "MQTT_ENABLED", False))


def command_topic_for_device(device_id: str) -> str:
    return settings.MQTT_COMMAND_TOPIC_TEMPLATE.format(device_id=device_id)


def _build_payload(command: Command) -> str:
    return json.dumps(
        {
            "cmd_id": command.id,
            "type": command.cmd_type,
            "payload": command.payload,
            "ts": int(timezone.now().timestamp()),
        },
        separators=(",", ":"),
    )


def publish_command(command: Command) -> None:
    if not mqtt_enabled():
        return

    topic = command_topic_for_device(command.device.device_id)
    payload = _build_payload(command)

    # Fast path: reuse the persistent client if available (mqtt_worker process).
    with _client_lock:
        client = _client

    if client is not None and _client_connected.is_set():
        try:
            result = client.publish(topic, payload=payload, qos=settings.MQTT_COMMAND_QOS, retain=False)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug("Command %s published via persistent client.", command.id)
                return
            logger.warning(
                "Persistent client publish returned rc=%s for command %s, falling back.",
                result.rc,
                command.id,
            )
        except Exception:
            logger.exception("Persistent client publish failed for command %s, falling back.", command.id)

    # Slow path: one-shot connection (gunicorn workers or persistent client unavailable).
    logger.debug("Publishing command %s via single().", command.id)
    import paho.mqtt.publish as publish_single

    auth = {"username": settings.MQTT_USERNAME, "password": settings.MQTT_PASSWORD} if settings.MQTT_USERNAME else None
    tls = None
    if settings.MQTT_TLS_ENABLED:
        tls = {"cert_reqs": 2, "insecure": settings.MQTT_TLS_INSECURE}
        if settings.MQTT_TLS_CA_CERT:
            tls["ca_certs"] = settings.MQTT_TLS_CA_CERT

    publish_single.single(
        topic=topic,
        payload=payload,
        hostname=settings.MQTT_HOST,
        port=settings.MQTT_PORT,
        auth=auth,
        tls=tls,
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

    update_fields = ["last_seen"]
    dev.last_seen = now
    if ack_id > dev.last_ack_id:
        dev.last_ack_id = ack_id
        update_fields.append("last_ack_id")
    dev.save(update_fields=update_fields)
