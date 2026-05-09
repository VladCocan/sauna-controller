from django.contrib import admin, messages
from .models import Device, Telemetry, Command


@admin.action(description="Rotate device token (shows once)")
def rotate_device_token(modeladmin, request, queryset):
    if queryset.count() != 1:
        messages.error(request, "Selectează exact 1 device ca să afișez token-ul (se arată o singură dată).")
        return
    dev = queryset.first()
    token = dev.rotate_token()
    messages.warning(request, f"NEW TOKEN for {dev.device_id}: {token}")


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("device_id", "owner", "last_seen", "last_ack_id")
    search_fields = ("device_id", "owner__username", "owner__email")
    list_filter = ("owner",)
    filter_horizontal = ("shared_users",)
    actions = [rotate_device_token]


@admin.register(Telemetry)
class TelemetryAdmin(admin.ModelAdmin):
    list_display = ("device", "ts")
    list_filter = ("device",)
    ordering = ("-ts",)


@admin.register(Command)
class CommandAdmin(admin.ModelAdmin):
    list_display = ("device", "id", "cmd_type", "status", "created_at", "acked_at")
    list_filter = ("device", "status", "cmd_type")
    ordering = ("-id",)