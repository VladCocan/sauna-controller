import json
import queue
import time
from django.conf import settings as django_settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse, StreamingHttpResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_http_methods
from pathlib import Path
from django.db.models import Q

from .models import Device, Telemetry, Command

from django.utils import timezone
from django.views.decorators.http import require_GET

from django.db.models import F
from datetime import timedelta


NUMBER_COMMAND_SPECS = {
    "boost_window": {"min": 5.0, "max": 30.0, "step": 1.0},
    "boost_exit": {"min": 2.0, "max": 15.0, "step": 1.0},
    "max_session_min": {"min": 30.0, "max": 240.0, "step": 5.0},
    "fan_dt_sp": {"min": 1.0, "max": 250.0, "step": 0.5},
}

SELECT_COMMAND_SPECS = {
    "control_temp_source": {
        "options": {"Average (Top+Head)", "Top", "Head"},
    },
}

BUTTON_COMMANDS = {
    "restart",
    "reset_energy",
    "reset_runtime",
    "reset_eta",
    "reset_thermal",
}


def get_device_for_user(device_id: str, user):
    """Return the device if the user is the owner OR a shared_user."""
    return get_object_or_404(
        Device.objects.filter(
            Q(owner=user) | Q(shared_users=user)
        ).distinct(),
        device_id=device_id,
    )


@login_required
@require_GET
def telemetry_series(request):
    device_id = request.GET.get("device_id")
    if not device_id:
        return JsonResponse({"error": "missing_device_id"}, status=400)

    hours = float(request.GET.get("hours", "2"))
    limit = int(request.GET.get("limit", "480"))

    dev = get_device_for_user(device_id, request.user)
    since = timezone.now() - timedelta(hours=hours)

    qs = (
        Telemetry.objects
        .filter(device=dev, ts__gte=since)
        .order_by("-ts")
        .only("ts", "payload")[:limit]
    )

    rows = []
    for t in reversed(list(qs)):
        s = (t.payload or {}).get("status", {}) if t.payload else {}
        rows.append({
            "ts": t.ts.isoformat(),
            "t_top_c": s.get("t_top_c"),
            "t_head_c": s.get("t_head_c"),
            "t_under_c": s.get("t_under_c"),
            "setpoint_c": s.get("setpoint_c"),
            "heater_power_pct": s.get("heater_power_pct"),
            "contactor_active": s.get("contactor_active"),
            "mode": s.get("mode"),
        })

    return JsonResponse({"device_id": dev.device_id, "rows": rows})

@login_required
@require_GET
def device_status(request):
    device_id = request.GET.get("device_id")
    if not device_id:
        return JsonResponse({"error": "missing_device_id"}, status=400)

    dev = get_device_for_user(device_id, request.user)
    t = Telemetry.objects.filter(device=dev).order_by("-ts").first()

    now = timezone.now()
    online = bool(dev.last_seen and (now - dev.last_seen).total_seconds() <= 90)

    payload = t.payload if t else None
    status = (payload or {}).get("status", {}) if payload else {}

    return JsonResponse({
        "device_id": dev.device_id,
        "last_ack_id": dev.last_ack_id,
        "last_seen": dev.last_seen.isoformat() if dev.last_seen else None,
        "online": online,
        "ts": t.ts.isoformat() if t else None,
        "status": status,
    })


@login_required
@require_GET
def device_commands(request):
    device_id = request.GET.get("device_id")
    if not device_id:
        return JsonResponse({"error": "missing_device_id"}, status=400)

    dev = get_device_for_user(device_id, request.user)
    qs = Command.objects.filter(device=dev, status=Command.STATUS_PENDING).order_by("-id")[:20]
    return JsonResponse({
        "pending": [{"id": c.id, "type": c.cmd_type, "payload": c.payload, "created_at": c.created_at.isoformat()} for c in qs]
    })


@login_required
def dashboard(request):
    devices = list(
        Device.objects.filter(
            Q(owner=request.user) | Q(shared_users=request.user)
        ).distinct().order_by("device_id")
    )

    latest = {}
    for d in devices:
        t = Telemetry.objects.filter(device=d).order_by("-ts").first()
        latest[d.id] = t.payload if t else None

    # diagnostics are provided by the device via its status payload; frontend will fetch them
    return render(request, "core/dashboard.html", {
        "devices": devices,
        "latest": latest,
        "build": django_settings.APP_BUILD,
    })


@login_required
@require_http_methods(["POST"])
def set_climate(request):
    device_id = request.POST.get("device_id")
    mode = request.POST.get("mode")  # OFF / HEAT
    setpoint_raw = request.POST.get("setpoint_c", "")

    if not device_id or mode not in ("OFF", "HEAT"):
        return HttpResponseBadRequest("bad request")

    dev = get_device_for_user(device_id, request.user)

    payload = {"mode": mode}
    if setpoint_raw != "":
        try:
            payload["setpoint_c"] = float(setpoint_raw)
        except ValueError:
            return HttpResponseBadRequest("bad setpoint")

    Command.objects.create(device=dev, cmd_type="set_climate", payload=payload)
    return JsonResponse({"ok": True})


@login_required
@require_http_methods(["POST"])
def set_switch(request):
    device_id = request.POST.get("device_id")
    what = request.POST.get("what")  # fan / light / amp
    on_raw = request.POST.get("on")  # 1/0

    if not device_id or what not in ("fan", "light", "amp") or on_raw not in ("0", "1"):
        return HttpResponseBadRequest("bad request")

    dev = get_device_for_user(device_id, request.user)
    on = (on_raw == "1")

    if what == "fan":
        cmd_type = "set_fan"
        payload = {"destrat": on}
    elif what == "light":
        cmd_type = "set_light"
        payload = {"on": on}
    else:
        cmd_type = "set_amp"
        payload = {"on": on}

    Command.objects.create(device=dev, cmd_type=cmd_type, payload=payload)
    return JsonResponse({"ok": True})


@login_required
@require_http_methods(["POST"])
def set_diagnostic(request):
    device_id = request.POST.get("device_id")
    kind = request.POST.get("kind")
    key = request.POST.get("key")

    if not device_id or kind not in ("number", "select", "button") or not key:
        return HttpResponseBadRequest("bad request")

    dev = get_device_for_user(device_id, request.user)

    if kind == "number":
        spec = NUMBER_COMMAND_SPECS.get(key)
        raw_value = request.POST.get("value", "")
        if not spec or raw_value == "":
            return HttpResponseBadRequest("bad request")

        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            return HttpResponseBadRequest("bad value")

        if value < spec["min"] or value > spec["max"]:
            return HttpResponseBadRequest("value out of range")

        Command.objects.create(
            device=dev,
            cmd_type="set_number",
            payload={"name": key, "value": value},
        )
        return JsonResponse({"ok": True})

    if kind == "select":
        spec = SELECT_COMMAND_SPECS.get(key)
        option = request.POST.get("option")
        if not spec or option not in spec["options"]:
            return HttpResponseBadRequest("bad option")

        Command.objects.create(
            device=dev,
            cmd_type="set_select",
            payload={"name": key, "option": option},
        )
        return JsonResponse({"ok": True})

    if key not in BUTTON_COMMANDS:
        return HttpResponseBadRequest("bad button")

    Command.objects.create(
        device=dev,
        cmd_type="press_button",
        payload={"name": key},
    )
    return JsonResponse({"ok": True})


@login_required
@require_GET
def device_sse(request, device_id):
    """Server-Sent Events stream — DB polling, works across processes."""
    dev = get_device_for_user(device_id, request.user)

    def event_stream():
        last_ts = timezone.now()
        yield "retry: 3000\n\n"
        while True:
            t = (
                Telemetry.objects
                .filter(device=dev, ts__gt=last_ts)
                .order_by("ts")
                .first()
            )
            if t:
                last_ts = t.ts
                yield f"data: {json.dumps(t.payload)}\n\n"
            else:
                yield ": keepalive\n\n"
            time.sleep(1)

    return StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@require_GET
def pwa_service_worker(request):
    sw_path = Path(__file__).resolve().parent / "static" / "pwa" / "sw.js"
    if not sw_path.exists():
        return HttpResponse("Service worker not found", status=404, content_type="text/plain")

    response = HttpResponse(sw_path.read_text(encoding="utf-8"), content_type="application/javascript; charset=utf-8")
    response["Service-Worker-Allowed"] = "/"
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


@require_GET
def pwa_manifest(request):
    manifest_path = Path(__file__).resolve().parent / "static" / "pwa" / "manifest.webmanifest"
    if not manifest_path.exists():
        return HttpResponse("Manifest not found", status=404, content_type="text/plain")

    response = HttpResponse(
        manifest_path.read_text(encoding="utf-8"),
        content_type="application/manifest+json; charset=utf-8",
    )
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response