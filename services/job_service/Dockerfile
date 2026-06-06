FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

COPY shared/ /app/shared/
COPY job_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY job_service/ /app/

ENV PYTHONPATH=/app
ENV DJANGO_SETTINGS_MODULE=config.settings

CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8009 --workers=2 --worker-class=gevent --worker-connections=100 --timeout=120"]
