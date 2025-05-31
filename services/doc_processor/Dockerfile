FROM runpod/base:0.6.3-cuda11.8.0

# Set python3.11 as the default python
RUN ln -sf $(which python3.11) /usr/local/bin/python && \
    ln -sf $(which python3.11) /usr/local/bin/python3

# Install dependencies
COPY requirements.txt /requirements.txt
RUN uv pip install --upgrade -r /requirements.txt --no-cache-dir --system

# Add files
ADD handler.py .
ADD test_input.json .

# Run the handler
CMD python -u /handler.py

# docker build --platform linux/amd64 --tag mantrakp04/doc_processor:v1 . --push
# docker run -it --runtime=nvidia --rm mantrakp04/doc_processor:v1