"use node";

import type { ActionCtx } from "../_generated/server";
import type { RunnableConfig } from "@langchain/core/runnables";
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointMetadata,
  type CheckpointTuple,
  type PendingWrite,
  type ChannelVersions,
  type CheckpointListOptions,
} from "@langchain/langgraph-checkpoint";
import type { SerializerProtocol } from "@langchain/langgraph-checkpoint";
import { internal } from "../_generated/api";

// Use a more specific context type to ensure we have the right methods
type WriteableConvexCtx = ActionCtx;
type ReadableConvexCtx = ActionCtx

export class ConvexSaverInternal extends BaseCheckpointSaver {
  private namespace: string;

  constructor(private ctx: ReadableConvexCtx, serde?: SerializerProtocol, namespace = "default") {
    super(serde);
    this.namespace = namespace;
  }

  private getThreadId(config: RunnableConfig): string {
    return config.configurable?.thread_id || "default";
  }

  private getCheckpointNs(config: RunnableConfig): string {
    return config.configurable?.checkpoint_ns || "default";
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = this.getThreadId(config);
    const checkpointNs = this.getCheckpointNs(config);
    const checkpointId = config.configurable?.checkpoint_id;

    // Get the checkpoint
    const checkpointRow = await this.ctx.runQuery(internal.checkpointer.queries.getCheckpoint, {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpointId,
      namespace: this.namespace,
    });

    if (!checkpointRow) {
      return undefined;
    }

    // Get channel values
    const channelValues = await this.ctx.runQuery(internal.checkpointer.queries.getChannelValues, {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      channel_versions: checkpointRow.checkpoint.channel_versions,
      namespace: this.namespace,
    });

    // Deserialize channel values
    const channels: Record<string, any> = {};
    for (const { channel, type, blob } of channelValues) {
      if (blob) {
        // Convert ArrayBuffer to Uint8Array
        const uint8Array = new Uint8Array(blob);
        channels[channel] = this.serde.loadsTyped(type, uint8Array);
      }
    }

    // Reconstruct the original checkpoint with properly deserialized channel values
    const originalCheckpoint = {
      ...checkpointRow.checkpoint,
      // Merge the deserialized channel values from blobs with any already in the checkpoint
      channel_values: {
        ...checkpointRow.checkpoint.channel_values,
        ...channels
      }
    };

    // Get pending sends
    const pendingSends = await this.ctx.runQuery(internal.checkpointer.queries.getPendingSends, {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      parent_checkpoint_id: checkpointRow.parent_checkpoint_id,
      namespace: this.namespace,
    });

    // Deserialize pending sends
    const sends: [string, string, unknown][] = [];
    for (const { type, blob } of pendingSends) {
      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(blob);
      const decoded = this.serde.loadsTyped(type, uint8Array);
      // Ensure we have a 3-element tuple
      const send = Array.isArray(decoded) && decoded.length === 2 
        ? [decoded[0], "", decoded[1]] as [string, string, unknown]
        : decoded as [string, string, unknown];
      sends.push(send);
    }

    return {
      config: {
        ...config,
        configurable: {
          ...config.configurable,
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointRow.checkpoint_id,
        },
      },
      checkpoint: originalCheckpoint,
      metadata: checkpointRow.metadata || {},
      parentConfig: checkpointRow.parent_checkpoint_id
        ? {
            ...config,
            configurable: {
              ...config.configurable,
              checkpoint_id: checkpointRow.parent_checkpoint_id,
            },
          }
        : undefined,
      pendingWrites: sends,
    };
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = this.getThreadId(config);
    const checkpointNs = this.getCheckpointNs(config);

    const checkpoints = await this.ctx.runQuery(internal.checkpointer.queries.listCheckpoints, {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: options?.filter?.checkpoint_id,
      filter: options?.filter || {},
      before: options?.before?.configurable?.checkpoint_id,
      limit: options?.limit,
      namespace: this.namespace,
    });

    for (const checkpointRow of checkpoints) {
      // Get channel values for this checkpoint
      const channelValues = await this.ctx.runQuery(internal.checkpointer.queries.getChannelValues, {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        channel_versions: checkpointRow.checkpoint.channel_versions,
        namespace: this.namespace,
      });

      // Deserialize channel values
      const channels: Record<string, any> = {};
      for (const { channel, type, blob } of channelValues) {
        if (blob) {
          // Convert ArrayBuffer to Uint8Array
          const uint8Array = new Uint8Array(blob);
          channels[channel] = this.serde.loadsTyped(type, uint8Array);
        }
      }

      // Reconstruct the original checkpoint with properly deserialized channel values
      const originalCheckpoint = {
        ...checkpointRow.checkpoint,
        // Merge the deserialized channel values from blobs with any already in the checkpoint
        channel_values: {
          ...checkpointRow.checkpoint.channel_values,
          ...channels
        }
      };

      // Get pending sends
      const pendingSends = await this.ctx.runQuery(internal.checkpointer.queries.getPendingSends, {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        parent_checkpoint_id: checkpointRow.parent_checkpoint_id,
        namespace: this.namespace,
      });

      // Deserialize pending sends
      const sends: [string, string, unknown][] = [];
      for (const { type, blob } of pendingSends) {
        // Convert ArrayBuffer to Uint8Array
        const uint8Array = new Uint8Array(blob);
        const decoded = this.serde.loadsTyped(type, uint8Array);
        // Ensure we have a 3-element tuple
        const send = Array.isArray(decoded) && decoded.length === 2 
          ? [decoded[0], "", decoded[1]] as [string, string, unknown]
          : decoded as [string, string, unknown];
        sends.push(send);
      }

      yield {
        config: {
          ...config,
          configurable: {
            ...config.configurable,
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: checkpointRow.checkpoint_id,
          },
        },
        checkpoint: originalCheckpoint,
        metadata: checkpointRow.metadata || {},
        parentConfig: checkpointRow.parent_checkpoint_id
          ? {
              ...config,
              configurable: {
                ...config.configurable,
                checkpoint_id: checkpointRow.parent_checkpoint_id,
              },
            }
          : undefined,
        pendingWrites: sends,
      };
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions
  ): Promise<RunnableConfig> {
    if (!this.isWriteableCtx(this.ctx)) {
      throw new Error("Cannot perform mutation with read-only context");
    }

    const threadId = this.getThreadId(config);
    const checkpointNs = this.getCheckpointNs(config);
    const checkpointId = checkpoint.id;
    const parentCheckpointId = config.configurable?.checkpoint_id;

    // Create a safe copy of the checkpoint for Convex
    // We need to ensure complex objects are properly serialized
    const safeCheckpoint = {
      ...checkpoint,
      // Stringify any complex objects to ensure they're Convex-compatible
      channel_values: Object.fromEntries(
        Object.entries(checkpoint.channel_values).map(([key, value]) => {
          // If the value is a complex object, serialize it
          if (value !== null && typeof value === 'object') {
            // Store serialized data in the checkpoint's type field
            return [key, JSON.parse(JSON.stringify(value))];
          }
          return [key, value];
        })
      )
    };

    // Serialize channel blobs
    const blobs = [];
    for (const [channel, version] of Object.entries(newVersions)) {
      const value = checkpoint.channel_values[channel];
      if (value !== undefined) {
        const [type, blob] = this.serde.dumpsTyped(value);
        
        // Convert to ArrayBuffer for Convex compatibility
        const arrayBuffer = blob ? blob.buffer : undefined;
        
        blobs.push({
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          channel,
          version: String(version),
          type,
          blob: arrayBuffer,
          namespace: this.namespace,
        });
      }
    }

    // Save checkpoint and blobs
    await this.ctx.runMutation(internal.checkpointer.mutations.putCheckpoint, {
      thread_id: threadId,
      checkpoint_ns: checkpointNs,
      checkpoint_id: checkpointId,
      parent_checkpoint_id: parentCheckpointId,
      checkpoint: safeCheckpoint,
      metadata: JSON.parse(JSON.stringify(metadata)), // Ensure metadata is also Convex-compatible
      blobs,
      namespace: this.namespace,
    });

    return {
      ...config,
      configurable: {
        ...config.configurable,
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpointId,
      },
    };
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    if (!this.isWriteableCtx(this.ctx)) {
      throw new Error("Cannot perform mutation with read-only context");
    }

    const threadId = this.getThreadId(config);
    const checkpointNs = this.getCheckpointNs(config);
    const checkpointId = config.configurable?.checkpoint_id;

    if (!checkpointId) {
      throw new Error("Checkpoint ID is required for putWrites");
    }

    const serializedWrites = writes.map((write, idx) => {
      const channel = write[0];
      const value = write[1];
      const [type, blob] = this.serde.dumpsTyped(value);

      // Convert to Uint8Array for Convex compatibility
      // Convex expects ArrayBuffer, not Node.js Buffer objects
      const arrayBuffer = blob ? blob.buffer : new ArrayBuffer(0);

      return {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpointId,
        task_id: taskId,
        idx,
        channel,
        type,
        blob: arrayBuffer,
        namespace: this.namespace,
      };
    });

    await this.ctx.runMutation(internal.checkpointer.mutations.putWrites, {
      writes: serializedWrites,
      namespace: this.namespace,
    });
  }

  async aget(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    return this.getTuple(config);
  }

  async *alist(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    yield* this.list(config, options);
  }

  async aput(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    newVersions: ChannelVersions
  ): Promise<RunnableConfig> {
    return this.put(config, checkpoint, metadata, newVersions);
  }

  async aputWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    return this.putWrites(config, writes, taskId);
  }

  // Helper method to check if context supports write operations
  private isWriteableCtx(ctx: ReadableConvexCtx): ctx is WriteableConvexCtx {
    return 'runMutation' in ctx;
  }
}

// Factory function for different Convex contexts
export function createConvexCheckpointer(
  ctx: ReadableConvexCtx,
  serde?: SerializerProtocol,
  namespace?: string
): ConvexSaverInternal {
  return new ConvexSaverInternal(ctx, serde, namespace);
}