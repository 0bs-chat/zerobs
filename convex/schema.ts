import { defineSchema } from "convex/server";
import { v } from "convex/values";
import { Table } from "convex-helpers/server";
import { authTables } from "@convex-dev/auth/server";

export const ApiKeys = Table("apiKeys", {
  userId: v.string(),
  key: v.string(),
  value: v.string(),
  enabled: v.boolean(),
});

export const Documents = Table("documents", {
  name: v.string(),
  type: v.union(
    v.literal("file"),
    v.literal("url"),
    v.literal("site"),
    v.literal("youtube"),
    v.literal("text"),
    v.literal("github"),
  ),
  size: v.number(),
  key: v.union(v.id("_storage"), v.string()),
  status: v.union(
    v.literal("processing"),
    v.literal("done"),
    v.literal("error"),
  ),
  userId: v.string(),
});

export const DocumentVectors = Table("documentVectors", {
  embedding: v.array(v.number()),
  text: v.string(),
  metadata: v.any(),
});

export const Chats = Table("chats", {
  userId: v.string(),
  name: v.string(),
  pinned: v.boolean(),
  documents: v.array(v.id("documents")),
  text: v.string(),
  model: v.string(),
  reasoningEffort: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
  ),
  projectId: v.union(v.id("projects"), v.null()), // use null, because we don't want to confuse undefined when unsetting or just not updating rest of the chat doc
  conductorMode: v.boolean(),
  orchestratorMode: v.boolean(),
  webSearch: v.boolean(),
  artifacts: v.boolean(),
  enabledToolkits: v.array(v.string()),
  updatedAt: v.number(),
  public: v.boolean(),
});

export const ChatMessages = Table("chatMessages", {
  chatId: v.id("chats"),
  message: v.string(),
  parentId: v.union(v.id("chatMessages"), v.null()),
  minimized: v.optional(v.boolean()),
});

export const Streams = Table("streams", {
  userId: v.string(),
  chatId: v.id("chats"),
  completedSteps: v.array(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("streaming"),
    v.literal("done"),
    v.literal("error"),
    v.literal("cancelled"),
  ),
});

export const StreamChunks = Table("streamChunks", {
  streamId: v.id("streams"),
  chunks: v.array(v.string()),
});

export const StreamChunkRefs = Table("streamChunkRefs", {
  streamId: v.id("streams"),
  chunkId: v.id("streamChunks"),
});

export const Projects = Table("projects", {
  name: v.string(),
  description: v.optional(v.string()),
  systemPrompt: v.string(),
  userId: v.string(),
  updatedAt: v.number(),
});

export const ProjectDocuments = Table("projectDocuments", {
  projectId: v.id("projects"),
  documentId: v.id("documents"),
  selected: v.boolean(),
});

export const ProjectChats = Table("projectChats", {
  projectId: v.id("projects"),
  chatId: v.id("chats"),
});

export const Mcps = Table("mcps", {
  name: v.string(),
  type: v.union(v.literal("http"), v.literal("stdio"), v.literal("docker")),
  dockerImage: v.optional(v.string()),
  dockerPort: v.optional(v.number()),
  dockerCommand: v.optional(v.string()),
  command: v.optional(v.string()),
  url: v.optional(v.string()),
  env: v.record(v.string(), v.string()),
  enabled: v.boolean(),
  status: v.union(
    v.literal("creating"),
    v.literal("created"),
    v.literal("error"),
  ),
  userId: v.optional(v.string()),
  updatedAt: v.number(),
});

export const Usage = Table("usage", {
  userId: v.string(),
  messages: v.number(),
});

export default defineSchema({
  ...authTables,
  apiKeys: ApiKeys.table
    .index("by_key", ["key"])
    .index("by_user_key", ["userId", "key"])
    .index("by_value_user", ["value", "userId"]),
  documents: Documents.table
    .index("by_key_user", ["key", "userId"])
    .index("by_user", ["userId"]),
  documentVectors: DocumentVectors.table.vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["metadata"],
  }),
  chats: Chats.table
    .index("by_user", ["userId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .searchIndex("by_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),
  chatMessages: ChatMessages.table
    .index("by_chat", ["chatId"])
    .index("by_parent", ["parentId"]),
  streams: Streams.table
    .index("by_user", ["userId"])
    .index("by_chat_user", ["chatId", "userId"])
    .index("by_status_user", ["status", "userId"]),
  streamChunks: StreamChunks.table.index("by_stream", ["streamId"]),
  projects: Projects.table.index("by_user_updated", ["userId", "updatedAt"]),
  projectDocuments: ProjectDocuments.table
    .index("by_project", ["projectId"])
    .index("by_document_project", ["documentId", "projectId"]),
  mcps: Mcps.table
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_enabled_user", ["enabled", "userId"]),
  streamChunkRefs: StreamChunkRefs.table.index("by_stream", ["streamId"]),
  usage: Usage.table.index("by_user", ["userId"]),
});
