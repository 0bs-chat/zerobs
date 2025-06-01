import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Mutation to save a checkpoint and its blobs
export const putCheckpoint = internalMutation({
  args: {
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.string(),
    parent_checkpoint_id: v.optional(v.string()),
    checkpoint: v.any(),
    metadata: v.any(),
    blobs: v.array(v.object({
      thread_id: v.string(),
      checkpoint_ns: v.string(),
      channel: v.string(),
      version: v.string(),
      type: v.string(),
      blob: v.optional(v.bytes()),
      namespace: v.string(),
    })),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const {
      thread_id,
      checkpoint_ns,
      checkpoint_id,
      parent_checkpoint_id,
      checkpoint,
      metadata,
      blobs,
      namespace,
    } = args;

    // Upsert checkpoint
    const existingCheckpoint = await ctx.db
      .query("checkpoints")
      .withIndex("by_checkpoint", (q) =>
        q.eq("namespace", namespace)
         .eq("thread_id", thread_id)
         .eq("checkpoint_ns", checkpoint_ns)
         .eq("checkpoint_id", checkpoint_id)
      )
      .first();

    if (existingCheckpoint) {
      await ctx.db.patch(existingCheckpoint._id, {
        checkpoint,
        metadata,
        parent_checkpoint_id,
      });
    } else {
      await ctx.db.insert("checkpoints", {
        thread_id,
        checkpoint_ns,
        checkpoint_id,
        parent_checkpoint_id,
        checkpoint,
        metadata,
        namespace,
      });
    }

    // Upsert blobs
    for (const blob of blobs) {
      const existingBlob = await ctx.db
        .query("checkpoint_blobs")
        .withIndex("by_channel", (q) =>
          q.eq("namespace", namespace)
           .eq("thread_id", blob.thread_id)
           .eq("checkpoint_ns", blob.checkpoint_ns)
           .eq("channel", blob.channel)
           .eq("version", blob.version)
        )
        .first();

      if (!existingBlob) {
        await ctx.db.insert("checkpoint_blobs", blob);
      }
      // Note: We don't update existing blobs (ON CONFLICT DO NOTHING behavior)
    }
  },
});

// Mutation to save checkpoint writes
export const putWrites = internalMutation({
  args: {
    writes: v.array(v.object({
      thread_id: v.string(),
      checkpoint_ns: v.string(),
      checkpoint_id: v.string(),
      task_id: v.string(),
      idx: v.number(),
      channel: v.string(),
      type: v.string(),
      blob: v.bytes(),
      namespace: v.string(),
    })),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const { writes, namespace } = args;

    for (const write of writes) {
      const existingWrite = await ctx.db
        .query("checkpoint_writes")
        .withIndex("by_task", (q) =>
          q.eq("namespace", namespace)
           .eq("thread_id", write.thread_id)
           .eq("checkpoint_ns", write.checkpoint_ns)
           .eq("checkpoint_id", write.checkpoint_id)
           .eq("task_id", write.task_id)
           .eq("idx", write.idx)
        )
        .first();

      if (existingWrite) {
        // Update existing write
        await ctx.db.patch(existingWrite._id, {
          channel: write.channel,
          type: write.type,
          blob: write.blob,
        });
      } else {
        // Insert new write
        await ctx.db.insert("checkpoint_writes", write);
      }
    }
  },
});