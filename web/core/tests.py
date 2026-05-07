import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse

from .models import Command, Device, Telemetry
from .mqtt_bridge import ingest_telemetry_payload, publish_command


class MqttBridgeTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="alice", password="pass12345")
        self.device = Device.objects.create(
            owner=user,
            device_id="sauna-controller",
            token_hash=make_password("test-token"),
        )

    def test_ingest_telemetry_creates_row_and_updates_last_seen(self):
        payload = {
            "device_id": self.device.device_id,
            "status": {"mode": "HEAT", "t_top_c": 72.5},
            "last_ack_id": 0,
        }
        ingest_telemetry_payload(json.dumps(payload).encode("utf-8"))

        self.assertEqual(Telemetry.objects.filter(device=self.device).count(), 1)

        self.device.refresh_from_db()
        self.assertIsNotNone(self.device.last_seen)
        self.assertEqual(self.device.last_ack_id, 0)

    def test_ingest_telemetry_marks_commands_acked(self):
        c1 = Command.objects.create(device=self.device, cmd_type="set_light", payload={"on": True})
        c2 = Command.objects.create(device=self.device, cmd_type="set_fan", payload={"destrat": True})
        c3 = Command.objects.create(device=self.device, cmd_type="set_amp", payload={"on": False})

        payload = {
            "device_id": self.device.device_id,
            "status": {"mode": "OFF"},
            "last_ack_id": c2.id,
        }
        ingest_telemetry_payload(json.dumps(payload).encode("utf-8"))

        c1.refresh_from_db()
        c2.refresh_from_db()
        c3.refresh_from_db()
        self.assertEqual(c1.status, Command.STATUS_ACKED)
        self.assertEqual(c2.status, Command.STATUS_ACKED)
        self.assertEqual(c3.status, Command.STATUS_PENDING)

        self.device.refresh_from_db()
        self.assertEqual(self.device.last_ack_id, c2.id)

    @override_settings(
        MQTT_ENABLED=True,
        MQTT_HOST="mqtt",
        MQTT_PORT=1883,
        MQTT_USERNAME="u",
        MQTT_PASSWORD="p",
        MQTT_COMMAND_TOPIC_TEMPLATE="sauna/{device_id}/cmd",
        MQTT_COMMAND_QOS=1,
    )
    @patch("core.mqtt_bridge.publish.single")
    def test_publish_command_sends_expected_topic_and_payload(self, mock_publish_single):
        cmd = Command.objects.create(
            device=self.device,
            cmd_type="set_climate",
            payload={"mode": "HEAT", "setpoint_c": 90.0},
        )

        publish_command(cmd)

        self.assertTrue(mock_publish_single.called)
        kwargs = mock_publish_single.call_args.kwargs
        self.assertEqual(kwargs["topic"], "sauna/sauna-controller/cmd")
        payload = json.loads(kwargs["payload"])
        self.assertEqual(payload["cmd_id"], cmd.id)
        self.assertEqual(payload["type"], "set_climate")


class UserUiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="bob", password="pass12345")
        self.other = get_user_model().objects.create_user(username="mallory", password="pass12345")
        self.device = Device.objects.create(owner=self.user, device_id="dev-1")
        Device.objects.create(owner=self.other, device_id="dev-2")

    def test_device_status_requires_login(self):
        response = self.client.get(reverse("device_status"), {"device_id": self.device.device_id})
        self.assertEqual(response.status_code, 302)

    def test_set_switch_rejects_invalid_payload(self):
        self.client.login(username="bob", password="pass12345")
        response = self.client.post(
            reverse("set_switch"),
            data={"device_id": self.device.device_id, "what": "invalid", "on": "1"},
        )
        self.assertEqual(response.status_code, 400)

    def test_user_cannot_access_other_users_device_status(self):
        self.client.login(username="bob", password="pass12345")
        response = self.client.get(reverse("device_status"), {"device_id": "dev-2"})
        self.assertEqual(response.status_code, 404)

    def test_set_diagnostic_number_creates_command(self):
        self.client.login(username="bob", password="pass12345")
        response = self.client.post(
            reverse("set_diagnostic"),
            data={
                "device_id": self.device.device_id,
                "kind": "number",
                "key": "boost_window",
                "value": "18",
            },
        )
        self.assertEqual(response.status_code, 200)

        cmd = Command.objects.filter(device=self.device).order_by("-id").first()
        self.assertIsNotNone(cmd)
        self.assertEqual(cmd.cmd_type, "set_number")
        self.assertEqual(cmd.payload["name"], "boost_window")
        self.assertEqual(cmd.payload["value"], 18.0)

    def test_set_diagnostic_rejects_invalid_select_option(self):
        self.client.login(username="bob", password="pass12345")
        response = self.client.post(
            reverse("set_diagnostic"),
            data={
                "device_id": self.device.device_id,
                "kind": "select",
                "key": "control_temp_source",
                "option": "Invalid",
            },
        )
        self.assertEqual(response.status_code, 400)
