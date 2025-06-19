import { defineSchema } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { Table } from "convex-helpers/server";

export const ApiKeys = Table("apiKeys", {
  userId: v.optional(v.id("users")),
  key: v.string(),
  value: v.string(),
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
  userId: v.id("users"),
});

export const DocumentVectors = Table("documentVectors", {
  embedding: v.array(v.number()),
  text: v.string(),
  metadata: v.any(),
});

export const Chats = Table("chats", {
  name: v.string(),
  userId: v.id("users"),
  pinned: v.boolean(),
  updatedAt: v.number(),
});

export const ChatInputs = Table("chatInputs", {
  chatId: v.union(v.id("chats"), v.literal("new")),
  userId: v.id("users"),
  documents: v.optional(v.array(v.id("documents"))),
  text: v.optional(v.string()),
  projectId: v.optional(v.union(v.id("projects"), v.null())),
  agentMode: v.optional(v.boolean()),
  plannerMode: v.optional(v.boolean()),
  webSearch: v.optional(v.boolean()),
  artifacts: v.optional(v.boolean()),
  model: v.optional(v.string()),
  streamId: v.optional(v.id("streams")),
  updatedAt: v.number(),
});

export const Streams = Table("streams", {
  userId: v.id("users"),
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

export const Projects = Table("projects", {
  name: v.string(),
  description: v.optional(v.string()),
  systemPrompt: v.optional(v.string()),
  userId: v.id("users"),
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
  type: v.union(v.literal("sse"), v.literal("stdio"), v.literal("docker")),
  dockerImage: v.optional(v.string()),
  dockerPort: v.optional(v.number()),
  command: v.optional(v.string()),
  url: v.optional(v.string()),
  env: v.optional(v.record(v.string(), v.string())),
  enabled: v.boolean(),
  status: v.union(
    v.literal("creating"),
    v.literal("created"),
    v.literal("error"),
  ),
  restartOnNewChat: v.boolean(),
  userId: v.id("users"),
  updatedAt: v.number(),
});

export const Checkpoints = Table("checkpoints", {
  thread_id: v.string(),
  checkpoint_ns: v.string(),
  checkpoint_id: v.string(),
  parent_checkpoint_id: v.optional(v.string()),
  checkpoint: v.any(),
  metadata: v.any(),
  namespace: v.string(),
  _creationTime: v.optional(v.number()),
});

export const CheckpointBlobs = Table("checkpoint_blobs", {
  thread_id: v.string(),
  checkpoint_ns: v.string(),
  channel: v.string(),
  version: v.string(),
  type: v.string(),
  blob: v.bytes(),
  namespace: v.string(),
});

export const CheckpointWrites = Table("checkpoint_writes", {
  thread_id: v.string(),
  checkpoint_ns: v.string(),
  checkpoint_id: v.string(),
  task_id: v.string(),
  idx: v.number(),
  channel: v.string(),
  type: v.string(),
  blob: v.bytes(),
  namespace: v.string(),
});

export const StreamChunkRefs = Table("streamChunkRefs", {
  streamId: v.id("streams"),
  chunkId: v.id("streamChunks"),
});

export const ProjectVectorsRefs = Table("projectVectorsRefs", {
  projectId: v.id("projects"),
  vectorId: v.id("documentVectors"),
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
    .index("by_user_updated", ["userId", "updatedAt"])
    .searchIndex("by_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),
  chatInputs: ChatInputs.table
    .index("by_user", ["userId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_chat_user", ["chatId", "userId"]),
  streams: Streams.table
    .index("by_user", ["userId"])
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
  checkpoints: Checkpoints.table
    .index("by_thread", ["namespace", "thread_id", "checkpoint_ns"])
    .index("by_checkpoint", [
      "namespace",
      "thread_id",
      "checkpoint_ns",
      "checkpoint_id",
    ]),
  checkpoint_blobs: CheckpointBlobs.table.index("by_channel", [
    "namespace",
    "thread_id",
    "checkpoint_ns",
    "channel",
    "version",
  ]),
  checkpoint_writes: CheckpointWrites.table
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
  streamChunkRefs: StreamChunkRefs.table.index("by_stream", ["streamId"]),
});
