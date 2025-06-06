import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  apiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    key: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_key_user", ["key", "userId"]),
  documents: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("file"),
      v.literal("text"),
      v.literal("url"),
      v.literal("site"),
      v.literal("youtube"),
    ),
    size: v.number(),
    key: v.union(v.id("_storage"), v.string()),
    status: v.union(
      v.literal("processing"),
      v.literal("done"),
      v.literal("error"),
    ),
    userId: v.id("users"),
  })
    .index("by_key_user", ["key", "userId"])
    .index("by_user", ["userId"]),
  documentVectors: defineTable({
    embedding: v.array(v.number()),
    text: v.string(),
    metadata: v.any(),
  }).vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["metadata"],
  }),
  chats: defineTable({
    name: v.string(),
    userId: v.id("users"),
    pinned: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .searchIndex("by_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),
  chatInput: defineTable({
    chatId: v.union(v.id("chats"), v.literal("new")),
    userId: v.id("users"),
    documents: v.optional(v.array(v.id("documents"))),
    text: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    agentMode: v.optional(v.boolean()),
    plannerMode: v.optional(v.boolean()),
    webSearch: v.optional(v.boolean()),
    model: v.optional(v.string()),
    streamId: v.optional(v.id("streams")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_chat_user", ["chatId", "userId"]),
  streams: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("done"),
      v.literal("error"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_status_user", ["status", "userId"]),
  streamChunks: defineTable({
    streamId: v.id("streams"),
    chunk: v.string(),
  }).index("by_stream", ["streamId"]),
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userId: v.id("users"),
    updatedAt: v.number(),
  }).index("by_user_updated", ["userId", "updatedAt"]),
  projectDocuments: defineTable({
    projectId: v.id("projects"),
    documentId: v.id("documents"),
    selected: v.boolean(),
  })
    .index("by_project", ["projectId"])
    .index("by_document_project", ["documentId", "projectId"]),
  mcps: defineTable({
    name: v.string(),
    type: v.union(v.literal("sse"), v.literal("stdio")),
    command: v.optional(v.string()),
    url: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
    enabled: v.boolean(),
    userId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_enabled_user", ["enabled", "userId"]),
  checkpoints: defineTable({
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.string(),
    parent_checkpoint_id: v.optional(v.string()),
    checkpoint: v.any(),
    metadata: v.any(),
    namespace: v.string(),
    _creationTime: v.optional(v.number()),
  })
    .index("by_thread", ["namespace", "thread_id", "checkpoint_ns"])
    .index("by_checkpoint", [
      "namespace",
      "thread_id",
      "checkpoint_ns",
      "checkpoint_id",
    ]),
  checkpoint_blobs: defineTable({
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    channel: v.string(),
    version: v.string(),
    type: v.string(),
    blob: v.bytes(),
    namespace: v.string(),
  }).index("by_channel", [
    "namespace",
    "thread_id",
    "checkpoint_ns",
    "channel",
    "version",
  ]),
  checkpoint_writes: defineTable({
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.string(),
    task_id: v.string(),
    idx: v.number(),
    channel: v.string(),
    type: v.string(),
    blob: v.bytes(),
    namespace: v.string(),
  })
    .index("by_checkpoint", [
      "namespace",
      "thread_id",
      "checkpoint_ns",
      "checkpoint_id",
    ])
    .index("by_task", [
      "namespace",
      "thread_id",
      "checkpoint_ns",
      "checkpoint_id",
      "task_id",
      "idx",
    ]),
});
