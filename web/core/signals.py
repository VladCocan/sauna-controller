import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Command
from .mqtt_bridge import publish_command, mqtt_enabled

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Command)
def publish_pending_command(sender, instance: Command, created: bool, **kwargs):
    if not created:
        return
    if instance.status != Command.STATUS_PENDING:
        return
    if not mqtt_enabled():
        return

    try:
        publish_command(instance)
    except Exception:
        logger.exception("Failed to publish command %s to MQTT", instance.id)
