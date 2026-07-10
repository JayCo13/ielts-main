FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --force-reinstall bcrypt==4.3.0

# Set environment variables for better performance
ENV PYTHONUNBUFFERED=1
ENV PYTHONOPTIMIZE=2
ENV WORKERS=12
ENV MAX_WORKERS=12
ENV TIMEOUT=300
ENV KEEP_ALIVE=120
ENV MAX_REQUESTS=10000
ENV MAX_REQUESTS_JITTER=1000

COPY . .

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "8", \
     "--limit-concurrency", "1000", \
     "--backlog", "1000", \
     "--timeout-keep-alive", "75", \
     "--timeout-graceful-shutdown", "30", \
     "--log-level", "warning"]
