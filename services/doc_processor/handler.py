"""Example handler file."""

import runpod
import httpx
from io import BytesIO
from docling.document_converter import DocumentConverter
from docling_core.types.io import DocumentStream

converter = DocumentConverter()

def handler(job):
    """Handler function that will be used to process jobs."""
    sources = (job.get('input', {})).get('sources', [])
    results = []
    for source in sources:
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

                results.append(markdown_output)

        except httpx.RequestError as e:
            results.append(str(e))
        except Exception as e:
            results.append(str(e))

    return {"output": results, "status_code": 200}

runpod.serverless.start({"handler": handler})
