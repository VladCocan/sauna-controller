from django.urls import path
from .views import health
from .views_ui import (
    dashboard, set_climate, set_switch, set_diagnostic,
    device_status, device_commands,
    telemetry_series,
    pwa_service_worker,
    pwa_manifest,
    device_sse,          # ← adaugă
)

urlpatterns = [
    path("health", health, name="health"),

    path("api/device_status", device_status, name="device_status"),
    path("api/device_commands", device_commands, name="device_commands"),
    path("sw.js", pwa_service_worker, name="pwa_service_worker"),
    path("manifest.webmanifest", pwa_manifest, name="pwa_manifest"),

    # UI (user)
    path("", dashboard, name="dashboard"),
    path("action/set_climate", set_climate, name="set_climate"),
    path("action/set_switch", set_switch, name="set_switch"),
    path("action/set_diagnostic", set_diagnostic, name="set_diagnostic"),

    path("api/telemetry_series", telemetry_series, name="telemetry_series"),
    
    path("sse/<str:device_id>/", device_sse, name="device_sse"),  # ← adaugă
    
]