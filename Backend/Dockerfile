FROM python:3.12-slim

WORKDIR /app

# for psycopg2 installs
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code (includes your other python files)
COPY . .

# Default (we'll override per service in docker-compose)
EXPOSE 8000
CMD ["uvicorn", "DiscussionDigestAPI:app", "--host", "0.0.0.0", "--port", "8000"]
