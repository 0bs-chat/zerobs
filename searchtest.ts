// searchtest.ts
import { load } from "cheerio";
import { z } from "zod";

// --- 1) Parse CLI args ---
const argv = process.argv.slice(2);
let query: string | undefined;
let returnImages = false;
let maxResults: number | undefined;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if ((a === "-q" || a === "--query") && argv[i + 1]) {
    query = argv[++i];
  } else if (a === "--return-images") {
    returnImages = true;
  } else if ((a === "--max-results" || a === "-m") && argv[i + 1]) {
    maxResults = Number(argv[++i]);
  } else {
    console.error(`Unknown arg: ${a}`);
    process.exit(1);
  }
}

if (!query) {
  console.error(
    `Usage: bun searchtest.ts -q "<query>" [--return-images] [--max-results N]`,
  );
  process.exit(1);
}

// --- 2) Define result schema with Zod ---
const Result = z.object({
  title: z.string(),
  source: z.string(),
  publishedDate: z.string().optional(),
  author: z.string().optional(),
  image: z.string().optional(),
  favicon: z.string().optional(),
});
const ResultsSchema = z.array(Result);

// --- 3) Helpers ---

// 3a) Fetch DuckDuckGo HTML page for a query
async function fetchSearchHtml(q: string): Promise<string> {
  const params = new URLSearchParams({ q });
  const res = await fetch(`https://duckduckgo.com/html?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/115.0.0.0 Safari/537.36",
      Referer: "https://duckduckgo.com/",
      Accept:
        "text/html,application/xhtml+xml,application/xml;" +
        "q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`HTML fetch failed: ${res.status}`);
  }
  return await res.text();
}

// 3b) Extract vqd token needed for i.js image API
function extractVqd(html: string): string {
  const $ = load(html);
  const vqd = $('input[name="vqd"]').attr("value");
  if (!vqd) throw new Error("vqd token not found in HTML");
  return vqd;
}

// 3c) Parse web results from DuckDuckGo HTML
function parseDDG(html: string) {
  const $ = load(html);
  const results = $(".result__body")
    .toArray()
    .map((el) => {
      const $el = $(el);
      const title = $el.find(".result__title .result__a").text().trim();

      // raw redirect link, unpack uddg if present
      const rawHref = $el.find(".result__title .result__a").attr("href") || "";
      let source = rawHref;
      try {
        const wrap = new URL(rawHref, "https://duckduckgo.com");
        source = wrap.searchParams.get("uddg") || wrap.href;
      } catch {
        // leave source = rawHref
      }

      const pd = $el.find(".result__extras span").text().trim();
      const publishedDate = pd || undefined;

      let favicon = $el.find(".result__icon__img").attr("src") || undefined;
      if (favicon?.startsWith("//")) favicon = "https:" + favicon;

      return {
        title,
        source,
        publishedDate,
        author: undefined,
        image: undefined,
        favicon,
      };
    });

  return ResultsSchema.parse(results);
}

// 3d) Perform DuckDuckGo image search via i.js, fix source fallback
async function searchImages(q: string) {
  const html = await fetchSearchHtml(q);
  const vqd = extractVqd(html);
  const params = new URLSearchParams({ q, vqd, l: "us-en" });
  const res = await fetch(`https://duckduckgo.com/i.js?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/115.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: "https://duckduckgo.com/",
    },
  });
  if (!res.ok) {
    throw new Error(`Image search failed: ${res.status}`);
  }
  const json = await res.json();
  const arr: any[] = json.results ?? json;

  const items = arr.map((it) => {
    const title = it.title || "";

    // Prefer page URL, else fallback to image origin
    let source = it.url || "";
    if (!source && it.image) {
      try {
        source = new URL(it.image).origin;
      } catch {
        source = "";
      }
    }

    // The direct image URL
    let image = it.image || it.thumbnail;
    if (image?.startsWith("//")) image = "https:" + image;
    else if (image?.startsWith("/") && source) {
      image = new URL(image, source).href;
    }

    const favicon = source
      ? `https://external-content.duckduckgo.com/ip3/${new URL(source).host}.ico`
      : undefined;

    return {
      title,
      source,
      publishedDate: undefined,
      author: undefined,
      image,
      favicon,
    };
  });

  return ResultsSchema.parse(items);
}

// --- 4) Main orchestration ---
(async () => {
  let results = [];

  if (returnImages) {
    results = await searchImages(query!);
  } else {
    const html = await fetchSearchHtml(query!);
    results = parseDDG(html);
  }

  if (maxResults !== undefined && results.length > maxResults) {
    results = results.slice(0, maxResults);
  }

  console.log(JSON.stringify(results, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
