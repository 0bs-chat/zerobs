#!/bin/bash
cd services

cd crawler
uv venv
uv pip install -r requirements.txt
cd ..

cd doc_processor
uv venv
uv pip install -r requirements.txt
cd ..

cd crawler && uv run app.py & cd .. && cd doc_processor && uv run app.py & cd ..