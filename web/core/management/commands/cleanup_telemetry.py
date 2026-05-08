from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Telemetry


class Command(BaseCommand):
    help = "Delete telemetry rows older than N days (default: 7)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Retention period in days (default: 7).",
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["days"])
        deleted, _ = Telemetry.objects.filter(ts__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} telemetry rows older than {options['days']} days."))