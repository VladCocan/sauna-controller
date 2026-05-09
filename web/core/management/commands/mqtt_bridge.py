import logging

import paho.mqtt.client as mqtt
from django.conf import settings
from django.core.management.base import BaseCommand

from core.mqtt_bridge import ingest_telemetry_payload, mqtt_enabled, register_persistent_client, start_retry_loop

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Consume telemetry from MQTT and persist to Django. Reuses the same connection for command publishes."

    def handle(self, *args, **options):
        if not mqtt_enabled():
            self.stdout.write(self.style.WARNING("MQTT bridge is disabled (MQTT_ENABLED=0)."))
            return

        topic = settings.MQTT_TELEMETRY_TOPIC
        client_id = "sauna-mqtt-bridge"

        client = mqtt.Client(client_id=client_id)
        if settings.MQTT_USERNAME:
            client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        if settings.MQTT_TLS_ENABLED:
            ca_certs = settings.MQTT_TLS_CA_CERT or None
            client.tls_set(ca_certs=ca_certs)
            client.tls_insecure_set(settings.MQTT_TLS_INSECURE)

        def on_connect(client_obj, _userdata, _flags, reason_code):
            if reason_code != 0:
                logger.error("MQTT bridge connect failed, reason_code=%s", reason_code)
                return
            logger.info("MQTT bridge connected, subscribing to topic=%s", topic)
            client_obj.subscribe(topic, qos=1)

            # Register for reuse by publish_command() in the same process.
            register_persistent_client(client_obj)
            start_retry_loop()

        def on_disconnect(_client_obj, _userdata, reason_code):
            logger.warning("MQTT bridge disconnected, reason_code=%s - will reconnect.", reason_code)

        def on_message(_client_obj, _userdata, msg):
            try:
                ingest_telemetry_payload(msg.payload)
            except Exception:
                logger.exception("Failed processing MQTT telemetry message on topic=%s", msg.topic)

        client.on_connect = on_connect
        client.on_disconnect = on_disconnect
        client.on_message = on_message
        client.reconnect_delay_set(min_delay=1, max_delay=30)

        self.stdout.write(f"Starting MQTT bridge on {settings.MQTT_HOST}:{settings.MQTT_PORT}, topic {topic}")
        client.connect(settings.MQTT_HOST, settings.MQTT_PORT, keepalive=30)
        client.loop_forever()
