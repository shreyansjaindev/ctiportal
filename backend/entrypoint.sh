#!/bin/bash

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating default superuser if it doesn't exist..."
python manage.py shell << END
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@ctiportal.local', 'admin123')
    print("Created default superuser: admin / admin123")
else:
    print("Superuser 'admin' already exists")
END

echo "Starting Django server..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
