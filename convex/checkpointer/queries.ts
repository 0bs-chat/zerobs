import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Query to get a specific checkpoint
export const getCheckpoint = internalQuery({
  args: {
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.optional(v.string()),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread_id, checkpoint_ns, checkpoint_id, namespace } = args;

    if (checkpoint_id) {
      // Get specific checkpoint
      return await ctx.db
        .query("checkpoints")
        .withIndex("by_checkpoint", (q) =>
          q
            .eq("namespace", namespace)
            .eq("thread_id", thread_id)
            .eq("checkpoint_ns", checkpoint_ns)
            .eq("checkpoint_id", checkpoint_id),
        )
        .first();
    } else {
      // Get latest checkpoint
      const checkpoints = await ctx.db
        .query("checkpoints")
        .withIndex("by_thread", (q) =>
          q
            .eq("namespace", namespace)
            .eq("thread_id", thread_id)
            .eq("checkpoint_ns", checkpoint_ns),
        )
        .order("desc")
        .first();

      return checkpoints;
    }
  },
});

// Query to get channel values for a checkpoint
export const getChannelValues = internalQuery({
  args: {
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    channel_versions: v.any(),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread_id, checkpoint_ns, channel_versions, namespace } = args;

    if (!channel_versions || typeof channel_versions !== "object") {
      return [];
    }

    const results = [];
    for (const [channel, version] of Object.entries(channel_versions)) {
      const blob = await ctx.db
        .query("checkpoint_blobs")
        .withIndex("by_channel", (q) =>
          q
            .eq("namespace", namespace)
            .eq("thread_id", thread_id)
            .eq("checkpoint_ns", checkpoint_ns)
            .eq("channel", channel)
            .eq("version", String(version)),
        )
        .first();

      if (blob) {
        results.push({
          channel: blob.channel,
          type: blob.type,
          blob: blob.blob,
        });
      }
    }

    return results;
  },
});

// Query to get pending sends for a checkpoint
export const getPendingSends = internalQuery({
  args: {
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    parent_checkpoint_id: v.optional(v.string()),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread_id, checkpoint_ns, parent_checkpoint_id, namespace } = args;

    if (!parent_checkpoint_id) {
      return [];
    }

    const writes = await ctx.db
      .query("checkpoint_writes")
      .withIndex("by_checkpoint", (q) =>
        q
          .eq("namespace", namespace)
          .eq("thread_id", thread_id)
          .eq("checkpoint_ns", checkpoint_ns)
          .eq("checkpoint_id", parent_checkpoint_id),
      )
      .filter((q) => q.eq(q.field("channel"), "__pregel_tasks__"))
      .collect();

    return writes
      .sort((a, b) => a.idx - b.idx)
      .map((write) => ({
        type: write.type,
        blob: write.blob,
      }));
  },
});

// Query to get pending writes for a checkpoint
export const getPendingWrites = internalQuery({
  args: {
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.string(),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread_id, checkpoint_ns, checkpoint_id, namespace } = args;

    const writes = await ctx.db
      .query("checkpoint_writes")
      .withIndex("by_checkpoint", (q) =>
        q
          .eq("namespace", namespace)
          .eq("thread_id", thread_id)
          .eq("checkpoint_ns", checkpoint_ns)
          .eq("checkpoint_id", checkpoint_id),
      )
      .collect();

    return writes
      .sort((a, b) => a.task_id.localeCompare(b.task_id) || a.idx - b.idx)
      .map((write) => ({
        task_id: write.task_id,
        channel: write.channel,
        type: write.type,
        blob: write.blob,
      }));
  },
});

// Query to list checkpoints
export const listCheckpoints = internalQuery({
  args: {
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.optional(v.string()),
    filter: v.any(),
    before: v.optional(v.string()),
    limit: v.optional(v.number()),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const {
      thread_id,
      checkpoint_ns,
      checkpoint_id,
      filter,
      before,
      limit,
      namespace,
    } = args;

    let query = ctx.db
      .query("checkpoints")
      .withIndex("by_thread", (q) =>
        q
          .eq("namespace", namespace)
          .eq("thread_id", thread_id)
          .eq("checkpoint_ns", checkpoint_ns),
      );

    // Apply filters
    if (checkpoint_id) {
      query = query.filter((q) =>
        q.eq(q.field("checkpoint_id"), checkpoint_id),
      );
    }

    if (before) {
      query = query.filter((q) => q.lt(q.field("checkpoint_id"), before));
    }

    // Apply metadata filter if provided
    if (filter && Object.keys(filter).length > 0) {
      query = query.filter((q) => {
        // Simple metadata filtering - in a real implementation,
        // you might want more sophisticated JSON querying
        let filterExpression = q.eq(q.field("metadata"), q.field("metadata")); // Always true base

        for (const key of Object.keys(filter)) {
          // Safer access without direct indexing
          const value = filter[key];
          filterExpression = q.and(
            filterExpression,
            q.eq(q.field(`metadata.${key}`), value),
          );
        }
        return filterExpression;
      });
    }

    // Collect and then sort results manually since we can't use order() after filter()
    const results = await query.collect();

    // Sort by creation time descending
    const sortedResults = results.sort(
      (a, b) => (b._creationTime || 0) - (a._creationTime || 0),
    );

    // Apply limit if provided
    return limit ? sortedResults.slice(0, limit) : sortedResults;
  },
});
