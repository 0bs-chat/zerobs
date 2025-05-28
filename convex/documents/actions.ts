"use node";

import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";

export const load = internalAction({
  args: {
    documentId: v.id("documents"),
    metadata: v.optional(
      v.object({
        source: v.id("projectDocuments"),
        projectId: v.id("projects"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const document = await ctx.runQuery(api.documents.queries.get, {
      documentId: args.documentId,
    });

    let pageContent = "";
    if (document.type === "file") {
      const documentUrl = new URL((await ctx.storage.getUrl(document.key))!);
      documentUrl.host = process.env.BACKEND_HOST || "backend";
      documentUrl.port = process.env.BACKEND_PORT || "3210";
      pageContent = await fetch(
        `http://${process.env.CONVERT_FILE_SERVICE_HOST || "services"}:${process.env.CONVERT_FILE_SERVICE_PORT || "5001"}/convert/?source=${encodeURIComponent(documentUrl.toString())}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SERVICE_PASS || "1234"}`,
          },
        }
      ).then(async (res) => await res.text());
    } else if (document.type === "url") {
      const res = await fetch(
        `http://${process.env.CRAWL_URL_SERVICE_HOST || "services"}:${process.env.CRAWL_URL_SERVICE_PORT || "5002"}/crawl/?url=${encodeURIComponent(document.key)}&max_depth=0`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SERVICE_PASS || "1234"}`,
          },
        }
      );
      const data = (await res.json()) as { url: string; markdown: string };
      pageContent = `# ${data.url}\n\n${data.markdown}`;
    } else if (document.type === "youtube") {
      const loader = YoutubeLoader.createFromUrl(document.key, {
        language: "en",
        addVideoInfo: true,
      });
      const docs = await loader.load();
      pageContent = docs
        .map(
          (doc) =>
            `# ${JSON.stringify(doc.metadata, null, 2)}\n\n${doc.pageContent}`
        )
        .join("\n\n");
    } else if (document.type === "site") {
      const res = await fetch(
        `http://${process.env.CRAWL_URL_SERVICE_HOST || "services"}:${process.env.CRAWL_URL_SERVICE_PORT || "5002"}/crawl/?url=${encodeURIComponent(document.key)}&max_depth=2`
      );
      const data = (await res.json()) as { url: string; markdown: string }[];
      pageContent = data.map((d) => `# ${d.url}\n\n${d.markdown}`).join("\n\n");
    } else {
      throw new Error("Invalid document type");
    }

    return {
      pageContent,
      ...(args.metadata ? { metadata: args.metadata } : {}),
    };
  },
});
