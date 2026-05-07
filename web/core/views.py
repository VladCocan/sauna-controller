from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse

def health(request):
    return JsonResponse({"ok": True})# write test Sun Mar  1 16:23:42 EET 2026
