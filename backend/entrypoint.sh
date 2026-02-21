#!/bin/bash
set -e

echo "==== Starting Django Application ===="
echo "Python version: $(python --version)"
echo "Gunicorn version: $(gunicorn --version)"

echo ""
echo "Running database migrations..."
python manage.py migrate --noinput

echo ""
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear --verbosity=2

echo ""
echo "Creating default superuser if it doesn't exist..."
python manage.py shell << END
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@ctiportal.local', 'admin123')
    print("✓ Created default superuser: admin / admin123")
else:
    print("✓ Superuser 'admin' already exists")
END

echo ""
echo "Starting Gunicorn application server..."
echo "Binding to 0.0.0.0:$PORT"
exec gunicorn \
  backend.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 4 \
  --worker-class sync \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
