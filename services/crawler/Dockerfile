FROM python:3.11-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set python3.11 as the default python
RUN ln -sf $(which python3.11) /usr/local/bin/python && \
    ln -sf $(which python3.11) /usr/local/bin/python3

# Install dependencies
COPY requirements.txt /requirements.txt
RUN uv pip install --upgrade -r /requirements.txt --no-cache-dir --system

# Add files
ADD handler.py .
ADD test_input.json .

RUN uv run playwright install --with-deps

# Run the handler
CMD python -u /handler.py

# docker build --platform linux/amd64 --tag mantrakp04/crawler:v1 . --push
# docker run -it --rm mantrakp04/crawler:v1