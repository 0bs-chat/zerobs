"use node";

import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { getEmbeddingModel } from "../agent/models";
import { embed } from "ai";
import { Innertube } from "youtubei.js";

// Native text splitter interface
interface TextSplitterParams {
  chunkSize: number;
  chunkOverlap: number;
  keepSeparator: boolean;
  lengthFunction?: (text: string) => number;
}

// Native recursive character text splitter implementation
class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private keepSeparator: boolean;
  private lengthFunction: (text: string) => number;
  private separators: string[];

  constructor(params: Partial<TextSplitterParams> & { separators?: string[] } = {}) {
    this.chunkSize = params.chunkSize ?? 1000;
    this.chunkOverlap = params.chunkOverlap ?? 200;
    this.keepSeparator = params.keepSeparator ?? true;
    this.lengthFunction = params.lengthFunction ?? ((text: string) => text.length);
    this.separators = params.separators ?? ["\n\n", "\n", " ", ""];

    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error("Cannot have chunkOverlap >= chunkSize");
    }
  }

  static fromLanguage(language: string, options: Partial<TextSplitterParams> = {}) {
    const separators = RecursiveCharacterTextSplitter.getSeparatorsForLanguage(language);
    return new RecursiveCharacterTextSplitter({
      ...options,
      separators,
    });
  }

  static getSeparatorsForLanguage(language: string): string[] {
    if (language === "markdown") {
      return [
        "\n## ",
        "\n### ",
        "\n#### ",
        "\n##### ",
        "\n###### ",
        "```\n\n",
        "\n\n***\n\n",
        "\n\n---\n\n",
        "\n\n___\n\n",
        "\n\n",
        "\n",
        " ",
        "",
      ];
    }
    // Default separators
    return ["\n\n", "\n", " ", ""];
  }

  async splitText(text: string): Promise<string[]> {
    return this._splitText(text, this.separators);
  }

  private async _splitText(text: string, separators: string[]): Promise<string[]> {
    const finalChunks: string[] = [];

    // Get appropriate separator to use
    let separator: string = separators[separators.length - 1];
    let newSeparators;
    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === "") {
        separator = s;
        break;
      }
      if (text.includes(s)) {
        separator = s;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    // Split the text
    const splits = this.splitOnSeparator(text, separator);

    // Merge and recursively split longer texts
    let goodSplits: string[] = [];
    const _separator = this.keepSeparator ? "" : separator;
    
    for (const s of splits) {
      if (this.lengthFunction(s) < this.chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length) {
          const mergedText = await this.mergeSplits(goodSplits, _separator);
          finalChunks.push(...mergedText);
          goodSplits = [];
        }
        if (!newSeparators) {
          finalChunks.push(s);
        } else {
          const otherInfo = await this._splitText(s, newSeparators);
          finalChunks.push(...otherInfo);
        }
      }
    }
    
    if (goodSplits.length) {
      const mergedText = await this.mergeSplits(goodSplits, _separator);
      finalChunks.push(...mergedText);
    }
    
    return finalChunks;
  }

  private splitOnSeparator(text: string, separator: string): string[] {
    let splits;
    if (separator) {
      if (this.keepSeparator) {
        const regexEscapedSeparator = separator.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
        splits = text.split(new RegExp(`(?=${regexEscapedSeparator})`));
      } else {
        splits = text.split(separator);
      }
    } else {
      splits = text.split("");
    }
    return splits.filter((s) => s !== "");
  }

  private joinDocs(docs: string[], separator: string): string | null {
    const text = docs.join(separator).trim();
    return text === "" ? null : text;
  }

  private async mergeSplits(splits: string[], separator: string): Promise<string[]> {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;
    
    for (const d of splits) {
      const _len = this.lengthFunction(d);
      if (total + _len + currentDoc.length * separator.length > this.chunkSize) {
        if (total > this.chunkSize) {
          console.warn(`Created a chunk of size ${total}, which is longer than the specified ${this.chunkSize}`);
        }
        if (currentDoc.length > 0) {
          const doc = this.joinDocs(currentDoc, separator);
          if (doc !== null) {
            docs.push(doc);
          }
          // Keep popping until we're within limits
          while (
            total > this.chunkOverlap ||
            (total + _len + currentDoc.length * separator.length > this.chunkSize && total > 0)
          ) {
            total -= this.lengthFunction(currentDoc[0]);
            currentDoc.shift();
          }
        }
      }
      currentDoc.push(d);
      total += _len;
    }
    
    const doc = this.joinDocs(currentDoc, separator);
    if (doc !== null) {
      docs.push(doc);
    }
    return docs;
  }
}

export const addDocument = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.runQuery(internal.documents.crud.read, {
      id: args.documentId,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    try {
      // Process documents by type
      let result: string;
      if (document.type === "file") {
        result = await processFiles(ctx, document);
      } else if (document.type === "url") {
        result = await processUrlsOrSites(ctx, document, 0);
      } else if (document.type === "site") {
        result = await processUrlsOrSites(ctx, document, 2);
      } else if (document.type === "youtube") {
        result = await processYoutubeVideo(ctx, document);
      } else {
        if (["text", "github"].includes(document.type)) {
          await ctx.runMutation(internal.documents.mutations.updateStatus, {
            documentId: args.documentId,
            update: {
              status: "done" as const,
            },
          });
          return null;
        }
        throw new Error(`Unknown document type: ${document.type}`);
      }

      // Use native text splitter for markdown
      const textSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const chunks = await textSplitter.splitText(result);

      // Create embeddings using the ai SDK
      const embeddingModel = await getEmbeddingModel(ctx, "embeddings");
      
      await Promise.all(chunks.map(async (chunk) => {
        const { embedding } = await embed({
          model: embeddingModel,
          value: chunk,
        });

        await ctx.runMutation(internal.documents.mutations.addVector, {
          documentId: document._id,
          text: chunk,
          embedding,
        });
      }));

      await ctx.runMutation(internal.documents.mutations.updateStatus, {
        documentId: args.documentId,
        update: {
          status: "done" as const,
        },
      });

      return null;
    } catch (error) {
      await ctx.runMutation(internal.documents.mutations.updateStatus, {
        documentId: args.documentId,
        update: {
          status: "error" as const,
        },
      });

      throw error;
    }
  },
});

async function processFiles(
  ctx: ActionCtx,
  document: Doc<"documents">,
): Promise<string> {
  return await ctx.runAction(internal.utils.services.index.processFile, {
    document,
  });
}

async function processUrlsOrSites(
  ctx: ActionCtx,
  document: Doc<"documents">,
  depth: number,
): Promise<string> {
  return await ctx.runAction(internal.utils.services.index.processUrlOrSite, {
    url: document.key,
    maxDepth: depth,
  });
}

async function processYoutubeVideo(
  ctx: ActionCtx,
  document: Doc<"documents">,
): Promise<string> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(document.key);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Use Innertube to get video info and transcript
    const youtube = await Innertube.create({
      retrieve_player: false,
    });
    
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    
    if (!transcriptData || !transcriptData.transcript || !transcriptData.transcript.content) {
      return `Title: ${info.basic_info.title || 'Unknown Title'}\nChannel: ${info.basic_info.author || 'Unknown Channel'}\n\nTranscript: No transcript available for this video.`;
    }
    
    const transcript = transcriptData.transcript.content.body?.initial_segments
      .map((segment: any) => segment.snippet.text)
      .join(" ") ?? "";
    
    if (!transcript) {
      return `Title: ${info.basic_info.title || 'Unknown Title'}\nChannel: ${info.basic_info.author || 'Unknown Channel'}\n\nTranscript: No transcript content available.`;
    }
    
    // Format the response with video metadata
    const title = info.basic_info.title || 'Unknown Title';
    const author = info.basic_info.author || 'Unknown Channel';
    const description = info.basic_info.short_description || '';
    const viewCount = info.basic_info.view_count || 0;
    
    return `# Title: ${title}\n## Channel: ${author}\n## Views: ${viewCount}\n## Description: ${description}\n\n## Transcript:\n${transcript}`;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process YouTube video: ${errorMessage}`);
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
