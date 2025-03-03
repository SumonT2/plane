import os
from celery import Celery
from plane.settings.redis import redis_instance
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plane.settings.production")

ri = redis_instance()

app = Celery("plane")

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object("django.conf:settings", namespace="CELERY")

app.conf.beat_schedule = {
    # Executes every day at 12 AM
    "check-every-day-to-archive-and-close": {
        "task": "plane.bgtasks.issue_automation_task.archive_and_close_old_issues",
        "schedule": crontab(hour=0, minute=0),
    },
    "check-every-day-to-delete_exporter_history": {
        "task": "plane.bgtasks.exporter_expired_task.delete_old_s3_link",
        "schedule": crontab(hour=0, minute=0),
    },
    "check-every-day-to-delete-file-asset": {
        "task": "plane.bgtasks.file_asset_task.delete_file_asset",
        "schedule": crontab(hour=0, minute=0),
    },
}

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

app.conf.beat_scheduler = 'django_celery_beat.schedulers.DatabaseScheduler'
