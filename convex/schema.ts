import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  documents: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("file"),
      v.literal("url"),
      v.literal("site"),
      v.literal("youtube")
    ),
    size: v.number(),
    key: v.union(v.id("_storage"), v.string()),
    userId: v.id("users"),
  })
    .index("by_key", ["key"])
    .index("by_user", ["userId"]),
  chats: defineTable({
    name: v.string(),
    userId: v.id("users"),
    pinned: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),
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
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_chat", ["chatId", "userId"]),
  chatStream: defineTable({
    chatId: v.id("chats"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("done"),
      v.literal("error")
    ),
    stream: v.optional(v.string()),
  }).index("by_chat", ["chatId"]),
  interrupt: defineTable({
    chatId: v.id("chats"),
    userId: v.id("users"),
    interrupt: v.boolean(),
    humanMessage: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_chat", ["chatId"]),
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),
  projectDocuments: defineTable({
    projectId: v.id("projects"),
    documentId: v.id("documents"),
    selected: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_document", ["projectId", "documentId"]),
  projectVectors: defineTable({
    embedding: v.array(v.number()),
    text: v.string(),
    metadata: v.any(),
  }).vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["metadata"],
  }),
  mcps: defineTable({
    name: v.string(),
    command: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
    url: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("running"), v.literal("stopped"), v.literal("error"))
    ),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status", ["status"]),
});
