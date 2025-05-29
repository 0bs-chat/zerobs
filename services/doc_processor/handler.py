"""Example handler file."""

import runpod
import httpx
from io import BytesIO
from docling.document_converter import DocumentConverter
from docling_core.types.io import DocumentStream

converter = DocumentConverter()

def handler(job):
    """Handler function that will be used to process jobs."""
    input_data = job.get('input', {})
    source = input_data.get('source')
    if not source:
        return {"error": "Missing 'source' in input", "status_code": 400}

    try:
        with httpx.Client() as client:
            response = client.get(source)
            response.raise_for_status()

            # Create document stream
            stream = BytesIO(response.content)
            doc_stream = DocumentStream(name=str(source.split("/")[-1]), stream=stream)

            result = converter.convert(doc_stream)
            markdown_output = result.document.export_to_markdown()

            return {"output": markdown_output, "status_code": 200}

    except httpx.RequestError as e:
        print(f"HTTP Request failed: {e}")
        return {"error": f"Failed to retrieve document from URL: {e}", "status_code": 500}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {"error": f"An unexpected error occurred during conversion: {e}", "status_code": 500}

runpod.serverless.start({"handler": handler})
