FROM python:3.9-slim

WORKDIR /app

# Zainstaluj wymagane narzędzia
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Skopiuj plik z zależnościami
COPY requirements.txt .

# Zainstaluj zależności
RUN pip install --no-cache-dir -r requirements.txt

# Skopiuj resztę plików
COPY . .

# Uruchom aplikację
CMD ["python", "api.py"]
