// searchWeb.ts
import puppeteer from "puppeteer-ghost";
import { JSDOM } from "jsdom";
import { z } from "zod";

// --- 1) Parse CLI args ---
const argv = process.argv.slice(2);
let url: string | undefined;
let returnImages = false;
let returnLinks = false;
let returnMetadata = false;
let returnContent = false;
let maxResults: number | undefined;
let waitTime = 3000; // Default wait time for JS to load
let headless = true; // Default to headless mode

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if ((a === "-u" || a === "--url") && argv[i + 1]) {
    url = argv[++i];
  } else if (a === "--return-images") {
    returnImages = true;
  } else if (a === "--return-links") {
    returnLinks = true;
  } else if (a === "--return-metadata") {
    returnMetadata = true;
  } else if (a === "--return-content") {
    returnContent = true;
  } else if ((a === "--max-results" || a === "-m") && argv[i + 1]) {
    maxResults = Number(argv[++i]);
  } else if ((a === "--wait" || a === "-w") && argv[i + 1]) {
    waitTime = Number(argv[++i]);
  } else if (a === "--visible") {
    headless = false;
  } else {
    console.error(`Unknown arg: ${a}`);
    process.exit(1);
  }
}

if (!url) {
  console.error(
    `Usage: bun searchWeb.ts -u "<url>" [--return-images] [--return-links] [--return-metadata] [--return-content] [--max-results N] [--wait N] [--visible]`,
  );
  process.exit(1);
}

// --- 2) Define result schema with Zod ---
const WebPageData = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  images: z.array(z.string()).optional(),
  links: z
    .array(
      z.object({
        href: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  metadata: z
    .object({
      author: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      language: z.string().optional(),
      robots: z.string().optional(),
      viewport: z.string().optional(),
      charset: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImage: z.string().optional(),
      ogType: z.string().optional(),
      twitterCard: z.string().optional(),
      twitterTitle: z.string().optional(),
      twitterDescription: z.string().optional(),
      twitterImage: z.string().optional(),
    })
    .optional(),
  favicon: z.string().optional(),
  status: z.number(),
  contentType: z.string().optional(),
});

// --- 3) Helpers ---

// 3a) Fetch webpage with Puppeteer Ghost (anti-detection)
async function fetchWebPageWithPuppeteerGhost(
  targetUrl: string,
): Promise<{ html: string; status: number; contentType?: string }> {
  const browser = await puppeteer.launch({
    headless: headless,
    defaultViewport: null, // Use full browser window size
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-blink-features=AutomationControlled",
      "--disable-extensions-except",
      "--disable-plugins-discovery",
      "--disable-default-apps",
      "--no-default-browser-check",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-client-side-phishing-detection",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-renderer-backgrounding",
      "--disable-sync",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--no-first-run",
      "--password-store=basic",
      "--use-mock-keychain",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Set extra headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
    });

    // Navigate to the page with longer timeout
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    if (!response) {
      throw new Error("Failed to load page");
    }

    // Wait for JavaScript to load and any dynamic content
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Additional wait for any remaining network activity
    try {
      await page.waitForFunction(() => document.readyState === "complete", {
        timeout: 10000,
      });
    } catch (e) {
      // Ignore timeout, continue anyway
    }

    // Get the rendered HTML
    const html = await page.content();

    return {
      html,
      status: response.status(),
      contentType: response.headers()["content-type"] || undefined,
    };
  } finally {
    await browser.close();
  }
}

// 3b) Parse webpage data using DOM methods
function parseWebPageWithDOM(
  html: string,
  targetUrl: string,
  status: number,
  contentType?: string,
) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const baseUrl = new URL(targetUrl);

  // Extract title
  const titleElement = doc.querySelector("title") || doc.querySelector("h1");
  const title = titleElement?.textContent?.trim() || "No title";

  // Extract description
  const descriptionMeta =
    doc.querySelector('meta[name="description"]') ||
    doc.querySelector('meta[property="og:description"]');
  const description =
    descriptionMeta?.getAttribute("content") ||
    doc.querySelector("p")?.textContent?.trim().substring(0, 200);

  // Extract content (main text)
  let content: string | undefined;
  if (returnContent) {
    // Remove script and style elements
    const scripts = doc.querySelectorAll("script, style, noscript");
    scripts.forEach((el) => el.remove());

    // Get text from main content areas
    const mainContent =
      doc.querySelector('main, article, .content, .post, .entry, [role="main"]')
        ?.textContent || doc.querySelector("body")?.textContent;
    content = mainContent?.trim().replace(/\s+/g, " ").substring(0, 2000);
  }

  // Extract images
  let images: string[] | undefined;
  if (returnImages) {
    const imgElements = doc.querySelectorAll("img");
    images = Array.from(imgElements)
      .map((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        if (!src) return null;

        // Resolve relative URLs
        try {
          return new URL(src, baseUrl.href).href;
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  }

  // Extract links
  let links: { href: string; text: string }[] | undefined;
  if (returnLinks) {
    const linkElements = doc.querySelectorAll("a");
    links = Array.from(linkElements)
      .map((link) => {
        const href = link.getAttribute("href");
        const text = link.textContent?.trim();
        if (!href || !text) return null;

        // Resolve relative URLs
        try {
          const resolvedHref = new URL(href, baseUrl.href).href;
          return { href: resolvedHref, text };
        } catch {
          return null;
        }
      })
      .filter((link): link is { href: string; text: string } => link !== null);
  }

  // Extract metadata
  let metadata: any | undefined;
  if (returnMetadata) {
    const getMetaContent = (name: string, property?: string) => {
      const selector = property
        ? `meta[property="${property}"]`
        : `meta[name="${name}"]`;
      return doc.querySelector(selector)?.getAttribute("content");
    };

    metadata = {
      author: getMetaContent("author"),
      keywords: getMetaContent("keywords")
        ?.split(",")
        .map((k) => k.trim()),
      language:
        getMetaContent("content-language", "http-equiv") ||
        doc.querySelector("html")?.getAttribute("lang"),
      robots: getMetaContent("robots"),
      viewport: getMetaContent("viewport"),
      charset:
        doc.querySelector("meta[charset]")?.getAttribute("charset") ||
        getMetaContent("content-type", "http-equiv"),
      ogTitle: getMetaContent("og:title", "property"),
      ogDescription: getMetaContent("og:description", "property"),
      ogImage: getMetaContent("og:image", "property"),
      ogType: getMetaContent("og:type", "property"),
      twitterCard: getMetaContent("twitter:card"),
      twitterTitle: getMetaContent("twitter:title"),
      twitterDescription: getMetaContent("twitter:description"),
      twitterImage: getMetaContent("twitter:image"),
    };
  }

  // Extract favicon
  const faviconElement =
    doc.querySelector('link[rel="icon"]') ||
    doc.querySelector('link[rel="shortcut icon"]');
  const favicon = faviconElement?.getAttribute("href");
  const resolvedFavicon = favicon
    ? new URL(favicon, baseUrl.href).href
    : undefined;

  return WebPageData.parse({
    url: targetUrl,
    title,
    description,
    content,
    images,
    links,
    metadata,
    favicon: resolvedFavicon,
    status,
    contentType,
  });
}

// --- 4) Main orchestration ---
(async () => {
  try {
    console.error(`Scraping with anti-detection: ${url}`);

    const { html, status, contentType } = await fetchWebPageWithPuppeteerGhost(
      url!,
    );
    const result = parseWebPageWithDOM(html, url!, status, contentType);

    // Apply max results if specified
    if (maxResults !== undefined) {
      if (result.images && result.images.length > maxResults) {
        result.images = result.images.slice(0, maxResults);
      }
      if (result.links && result.links.length > maxResults) {
        result.links = result.links.slice(0, maxResults);
      }
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
})();
