"""Example handler file."""

import runpod
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy

async def crawl_url(url, max_depth=2):
    # Configure the crawl
    config = CrawlerRunConfig(
        deep_crawl_strategy=BFSDeepCrawlStrategy(
            max_depth=max_depth, 
            include_external=False
        ) if max_depth > 0 else None,
        verbose=True
    )

    async with AsyncWebCrawler() as crawler:
        results = await crawler.arun(url, config=config)
        if len(results) > 0:
            return [{"url": result.url, "markdown": result.markdown} for result in results]
        else:
            return {
                "url": results.url,
                "markdown": results.markdown,
            }

async def handler(job):
    """Handler function that will be used to process jobs."""
    input_data = (job.get('input', [])).get('sources', [])
    results = []
    for input in input_data:
        # Get parameters
        url = input.get('url', "https://docs.crawl4ai.com/core/deep-crawling/")
        max_depth = input.get('max_depth', 0)
        
        if not url:
            return {"error": "Missing 'url' in input", "status_code": 400}
        
        try:
            # Use runpod's asyncio event loop to run the async crawl function
            results.append(await crawl_url(url, max_depth))
            
        except Exception as e:
            results.append({
                "url": url,
                "markdown": str(e)
            })

    return {"output": results, "status_code": 200}

runpod.serverless.start({"handler": handler})
