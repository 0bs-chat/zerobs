import { defineSchema } from "convex/server";
import { v } from "convex/values";
import { Table } from "convex-helpers/server";

export const Documents = Table("documents", {
  name: v.string(),
  type: v.union(
    v.literal("file"),
    v.literal("url"),
    v.literal("site"),
    v.literal("youtube"),
    v.literal("text"),
    v.literal("github")
  ),
  size: v.number(),
  key: v.union(v.id("_storage"), v.string()),
  status: v.union(
    v.literal("processing"),
    v.literal("done"),
    v.literal("error")
  ),
  userId: v.string(),
});

export const DocumentVectors = Table("documentVectors", {
  embedding: v.array(v.number()),
  text: v.string(),
  metadata: v.any(),
});

export const Chats = Table("chats", {
  name: v.string(),
  userId: v.string(),
  pinned: v.boolean(),
  updatedAt: v.number(),
});

export const ChatInputs = Table("chatInputs", {
  chatId: v.id("chats"),
  userId: v.string(),
  documents: v.optional(v.array(v.id("documents"))),
  text: v.optional(v.string()),
  projectId: v.optional(v.union(v.id("projects"), v.null())),
  agentMode: v.boolean(),
  plannerMode: v.boolean(),
  webSearch: v.boolean(),
  artifacts: v.optional(v.boolean()),
  model: v.string(),
  streamId: v.optional(v.id("streams")),
  updatedAt: v.number(),
});

export const Streams = Table("streams", {
  userId: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("streaming"),
    v.literal("done"),
    v.literal("error"),
    v.literal("cancelled")
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
  userId: v.string(),
  updatedAt: v.number(),
});

export const ProjectDocuments = Table("projectDocuments", {
  projectId: v.id("projects"),
  documentId: v.id("documents"),
  selected: v.boolean(),
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
    v.literal("error")
  ),
  restartOnNewChat: v.boolean(),
  userId: v.string(),
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

export default defineSchema({
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
