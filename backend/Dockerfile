# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl gcc \
    && rm -rf /var/lib/apt/lists/*

# Longer read timeout + automatic retries for slow/unstable connections,
# instead of failing on pip's short default socket timeout.
ENV PIP_DEFAULT_TIMEOUT=600
ENV PIP_RETRIES=10

COPY requirements.txt .

# NOTE: no separate torch install here. Local embeddings use FastEmbed
# (ONNX Runtime, see app/rag/embeddings.py) instead of sentence-transformers,
# so there is no ~190MB torch/CUDA download at all — this was previously the
# most common cause of build timeouts on slow/unstable connections.
#
# The --mount=type=cache mount persists pip's download cache across BOTH the
# `backend` and `mcp-server` image builds (they share this Dockerfile), so
# nothing is downloaded twice even when Compose builds both in parallel.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --timeout 600 --retries 10 -r requirements.txt

COPY . .

EXPOSE 8000 8765

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
