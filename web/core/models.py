import secrets
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password


class Device(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="devices")
    device_id = models.CharField(max_length=100, unique=True)

    # Bearer token stocat hash-uit (ca parola)
    token_hash = models.CharField(max_length=256, blank=True)

    last_seen = models.DateTimeField(null=True, blank=True)
    last_ack_id = models.BigIntegerField(default=0)

    def __str__(self):
        return f"{self.device_id} ({self.owner})"

    def rotate_token(self) -> str:
        token = secrets.token_urlsafe(32)
        self.token_hash = make_password(token)
        self.save(update_fields=["token_hash"])
        return token

    def check_token(self, token: str) -> bool:
        if not self.token_hash:
            return False
        return check_password(token, self.token_hash)


class Telemetry(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="telemetry")
    ts = models.DateTimeField(default=timezone.now)
    payload = models.JSONField()

    class Meta:
        indexes = [
            models.Index(fields=["device", "-ts"]),
        ]

    def __str__(self):
        return f"{self.device.device_id} @ {self.ts:%Y-%m-%d %H:%M:%S}"


class Command(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_ACKED = "ACKED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACKED, "Acked"),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="commands")
    cmd_type = models.CharField(max_length=50)
    payload = models.JSONField()

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    acked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.device.device_id} #{self.id} {self.cmd_type} {self.status}"