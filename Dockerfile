# KONSÜL AI — çoklu model konsey & kör jüri istasyonu
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    KONSUL_HOST=0.0.0.0

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Standart: 8888. PaaS PORT env'ini verirse run.py otomatik onu kullanır.
EXPOSE 8888

CMD ["python", "run.py"]
