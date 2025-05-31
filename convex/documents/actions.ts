"use node";

import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import runpodSdk from "runpod-sdk";
import type { Id } from "../_generated/dataModel";

const runpod = runpodSdk(process.env.RUN_POD_KEY!);
const crawler = runpod.endpoint(process.env.RUN_POD_CRAWLER_ID!);
const docProcessor = runpod.endpoint(
  process.env.RUN_POD_DOC_PROCESSOR_ID!
);

type ReturnType = {
  pageContent: string;
  metadata?: {
    projectId?: Id<"projects">;
  };
};

type Intermediate = ReturnType & { idx: number };

export const loadDocuments = internalAction({
  args: {
    documentIds: v.array(v.id("documents")),
    metadata: v.optional(
      v.object({
        projectId: v.optional(v.id("projects")),
      })
    ),
  },
  handler: async (ctx, args): Promise<ReturnType[]> => {
    // 1) fetch all docs
    const docs = await ctx.runQuery(
      api.documents.queries.getMultiple,
      { documentIds: args.documentIds }
    );

    // 2) group by type in one pass
    const groups: Record<string, Array<{ doc: typeof docs[0]; idx: number }>> =
      {
        file: [],
        text: [],
        url: [],
        site: [],
        youtube: [],
      };
    docs.forEach((doc, idx) => {
      const bucket = groups[doc.type];
      if (bucket) bucket.push({ doc, idx });
    });

    const results: Intermediate[] = [];
    const meta = args.metadata;

    function makeResult(
      pageContent: string,
      idx: number
    ): Intermediate {
      return {
        pageContent,
        ...(meta ? { metadata: { ...meta } } : {}),
        idx,
      };
    }

    // 3) process file documents in batch
    if (groups.file.length) {
      const sources = await Promise.all(
        groups.file.map(async ({ doc }) => {
          const url = await ctx.storage.getUrl(doc.key);
          if (!url) {
            throw new Error(`No signed URL for file: ${doc.key}`);
          }
          return url;
        })
      );
      const rp = await docProcessor?.runSync({ input: { sources } });
      if (!rp) {
        throw new Error("Document processor endpoint failed");
      }
      const pages = rp.output.output as string[];
      pages.forEach((pc, i) => {
        results.push(makeResult(pc, groups.file[i].idx));
      });
    }

    // 4) process text documents in batch
    if (groups.text.length) {
      const texts = await Promise.all(
        groups.text.map(({ doc }) =>
          ctx.storage.get(doc.key).then((r) => r?.text())
        )
      );
      texts.forEach((txt, i) => {
        const { doc } = groups.text[i];
        const content = `# ${doc.name}\n\n${txt}`;
        results.push(makeResult(content, groups.text[i].idx));
      });
    }

    // 5) helper to call the crawler
    async function crawl(
      group: Array<{ doc: typeof docs[0]; idx: number }>,
      maxDepth: number
    ) {
      if (!group.length) return;
      const sources = group.map(({ doc }) => ({
        url: doc.key,
        max_depth: maxDepth,
      }));
      const rp = await crawler?.runSync({ input: { sources } });
      if (!rp) {
        throw new Error("Crawler endpoint failed");
      }
      const out = rp.output.output as { url: string; markdown: string }[];
      out.forEach((item, i) => {
        const idx = group[i].idx;
        if (Array.isArray(item)) {
          // site => array of pages
          const combined = item
            .map(
              ({ url, markdown }) => `# ${url}\n\n${markdown}\n\n`
            )
            .join("\n\n");
          results.push(makeResult(combined, idx));
        } else {
          // url => single page
          const { url, markdown } = item;
          const page = `# ${url}\n\n${markdown}\n\n`;
          results.push(makeResult(page, idx));
        }
      });
    }

    await crawl(groups.url, 0);
    await crawl(groups.site, 2);

    // 6) process YouTube in parallel
    if (groups.youtube.length) {
      await Promise.all(
        groups.youtube.map(async ({ doc, idx }) => {
          const loader = YoutubeLoader.createFromUrl(doc.key, {
            language: "en",
            addVideoInfo: true,
          });
          const ytDocs = await loader.load();
          ytDocs.forEach((yt) => {
            const header = `# ${JSON.stringify(
              yt.metadata,
              null,
              2
            )}\n\n`;
            results.push(makeResult(header + yt.pageContent, idx));
          });
        })
      );
    }

    // 7) sort back into original order and strip idx
    return results
      .sort((a, b) => a.idx - b.idx)
      .map(({ pageContent, metadata }) =>
        metadata ? { pageContent, metadata } : { pageContent }
      );
  },
});