"use node";
import { ActionCtx } from "../_generated/server";
import type { RunnableConfig } from "@langchain/core/runnables";
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointTuple,
  type SerializerProtocol,
  type PendingWrite,
  type CheckpointMetadata,
  copyCheckpoint,
} from "@langchain/langgraph-checkpoint";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export class ConvexCheckpointSaver extends BaseCheckpointSaver {
  ctx: ActionCtx;
  namespace: string;

  constructor(
    ctx: ActionCtx,
    namespace: string = "default",
    serde?: SerializerProtocol
  ) {
    super(serde);
    this.ctx = ctx;
    this.namespace = namespace;
  }

  // Helper method to recursively serialize Langchain objects into plain objects for Convex
  private _serializeRecursively(value: any): any {
    // Handle null or undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this._serializeRecursively(item));
    }

    // Handle plain objects, including Langchain objects
    if (typeof value === "object") {
      // Check if it's a serializable Langchain object (has lc property with value 1)
      if (value.lc === 1 && value.type === "constructor" && Array.isArray(value.id)) {
        try {
          const [type, serialized] = this.serde.dumpsTyped(value);
          return {
            __lc_convex_serialized__: true,
            type,
            data: new TextDecoder().decode(serialized),
          };
        } catch (e) {
          console.error("Failed to serialize Langchain object:", e);
          // Fall back to plain object serialization
        }
      }

      // Handle other objects recursively
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this._serializeRecursively(val);
      }
      return result;
    }

    // Return primitives as is
    return value;
  }

  // Helper method to recursively deserialize plain objects back into Langchain objects
  private _deserializeRecursively(value: any): any {
    // Handle null or undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this._deserializeRecursively(item));
    }

    // Handle plain objects, including serialized Langchain objects
    if (typeof value === "object") {
      // Check if it's a serialized Langchain object
      if (value.__lc_convex_serialized__ === true && value.type && value.data) {
        try {
          return this.serde.loadsTyped(
            value.type,
            new TextEncoder().encode(value.data)
          );
        } catch (e) {
          console.error("Failed to deserialize Langchain object:", e);
          // Return the serialized form if deserialization fails
          return value;
        }
      }

      // Handle other objects recursively
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this._deserializeRecursively(val);
      }
      return result;
    }

    // Return primitives as is
    return value;
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const {
      thread_id,
      checkpoint_ns = "",
      checkpoint_id,
    } = config.configurable ?? {};

    if (!thread_id) {
      return undefined;
    }

    // Get the checkpoint
    const checkpoint = await this.ctx.runQuery(internal.checkpointer.queries.getCheckpoint, {
      thread_id,
      checkpoint_ns,
      checkpoint_id,
      namespace: this.namespace,
    });

    if (!checkpoint) {
      return undefined;
    }

    let finalConfig = config;
    if (!checkpoint_id) {
      finalConfig = {
        configurable: {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          checkpoint_id: checkpoint.checkpoint_id,
        },
      };
    }

    if (
      finalConfig.configurable?.thread_id === undefined ||
      finalConfig.configurable?.checkpoint_id === undefined
    ) {
      throw new Error("Missing thread_id or checkpoint_id");
    }

    // Get pending writes
    const pendingWritesData = await this.ctx.runQuery(
      internal.checkpointer.queries.getPendingWrites,
      {
        thread_id: checkpoint.thread_id,
        checkpoint_ns: checkpoint.checkpoint_ns,
        checkpoint_id: checkpoint.checkpoint_id,
        namespace: this.namespace,
      }
    );

    const pendingWrites = await Promise.all(
      pendingWritesData.map(async (write) => {
        return [
          write.task_id,
          write.channel,
          await this.serde.loadsTyped(
            write.type ?? "json",
            new TextDecoder().decode(write.blob)
          ),
        ] as [string, string, unknown];
      })
    );

    // Get pending sends
    const pendingSendsData = await this.ctx.runQuery(
      internal.checkpointer.queries.getPendingSends,
      {
        thread_id: checkpoint.thread_id,
        checkpoint_ns: checkpoint.checkpoint_ns,
        parent_checkpoint_id: checkpoint.parent_checkpoint_id,
        namespace: this.namespace,
      }
    );

    const pending_sends = await Promise.all(
      pendingSendsData.map((send) =>
        this.serde.loadsTyped(
          send.type ?? "json",
          new TextDecoder().decode(send.blob)
        )
      )
    );

    // Reconstruct the checkpoint with channel values
    const channelValues = await this.ctx.runQuery(
      internal.checkpointer.queries.getChannelValues,
      {
        thread_id: checkpoint.thread_id,
        checkpoint_ns: checkpoint.checkpoint_ns,
        channel_versions: checkpoint.checkpoint.channel_versions || {},
        namespace: this.namespace,
      }
    );

    // Deserialize the checkpoint and metadata
    const deserializedCheckpointObj = this._deserializeRecursively(checkpoint.checkpoint);
    const deserializedMetadata = this._deserializeRecursively(checkpoint.metadata);

    const deserializedCheckpoint = {
      ...deserializedCheckpointObj,
      pending_sends,
    } as Checkpoint;

    // Add channel values to checkpoint
    if (channelValues.length > 0) {
      const channelData: Record<string, unknown> = {};
      for (const channelValue of channelValues) {
        if (channelValue.blob) {
          channelData[channelValue.channel] = await this.serde.loadsTyped(
            channelValue.type ?? "json",
            new TextDecoder().decode(channelValue.blob)
          );
        }
      }
      Object.assign(deserializedCheckpoint, channelData);
    }

    return {
      checkpoint: deserializedCheckpoint,
      config: finalConfig,
      metadata: deserializedMetadata as CheckpointMetadata,
      parentConfig: checkpoint.parent_checkpoint_id
        ? {
            configurable: {
              thread_id: checkpoint.thread_id,
              checkpoint_ns: checkpoint.checkpoint_ns,
              checkpoint_id: checkpoint.parent_checkpoint_id,
            },
          }
        : undefined,
      pendingWrites,
    };
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    const { limit, before, filter } = options ?? {};
    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";

    if (!thread_id) {
      return;
    }

    const checkpoints = await this.ctx.runQuery(internal.checkpointer.queries.listCheckpoints, {
      thread_id,
      checkpoint_ns,
      filter: filter || {},
      before: before?.configurable?.checkpoint_id,
      limit,
      namespace: this.namespace,
    });

    for (const checkpoint of checkpoints) {
      // Get pending writes
      const pendingWritesData = await this.ctx.runQuery(
        internal.checkpointer.queries.getPendingWrites,
        {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          checkpoint_id: checkpoint.checkpoint_id,
          namespace: this.namespace,
        }
      );

      const pendingWrites = await Promise.all(
        pendingWritesData.map(async (write) => {
          return [
            write.task_id,
            write.channel,
            await this.serde.loadsTyped(
              write.type ?? "json",
              new TextDecoder().decode(write.blob)
            ),
          ] as [string, string, unknown];
        })
      );

      // Get pending sends
      const pendingSendsData = await this.ctx.runQuery(
        internal.checkpointer.queries.getPendingSends,
        {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          parent_checkpoint_id: checkpoint.parent_checkpoint_id,
          namespace: this.namespace,
        }
      );

      const pending_sends = await Promise.all(
        pendingSendsData.map((send) =>
          this.serde.loadsTyped(
            send.type ?? "json",
            new TextDecoder().decode(send.blob)
          )
        )
      );

      // Get channel values
      const channelValues = await this.ctx.runQuery(
        internal.checkpointer.queries.getChannelValues,
        {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          channel_versions: checkpoint.checkpoint.channel_versions || {},
          namespace: this.namespace,
        }
      );

      // Deserialize the checkpoint and metadata
      const deserializedCheckpointObj = this._deserializeRecursively(checkpoint.checkpoint);
      const deserializedMetadata = this._deserializeRecursively(checkpoint.metadata);

      const deserializedCheckpoint = {
        ...deserializedCheckpointObj,
        pending_sends,
      } as Checkpoint;

      // Add channel values to checkpoint
      if (channelValues.length > 0) {
        const channelData: Record<string, unknown> = {};
        for (const channelValue of channelValues) {
          if (channelValue.blob) {
            channelData[channelValue.channel] = await this.serde.loadsTyped(
              channelValue.type ?? "json",
              new TextDecoder().decode(channelValue.blob)
            );
          }
        }
        Object.assign(deserializedCheckpoint, channelData);
      }

      yield {
        config: {
          configurable: {
            thread_id: checkpoint.thread_id,
            checkpoint_ns: checkpoint.checkpoint_ns,
            checkpoint_id: checkpoint.checkpoint_id,
          },
        },
        checkpoint: deserializedCheckpoint,
        metadata: deserializedMetadata as CheckpointMetadata,
        parentConfig: checkpoint.parent_checkpoint_id
          ? {
              configurable: {
                thread_id: checkpoint.thread_id,
                checkpoint_ns: checkpoint.checkpoint_ns,
                checkpoint_id: checkpoint.parent_checkpoint_id,
              },
            }
          : undefined,
        pendingWrites,
      };
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    if (!config.configurable) {
      throw new Error("Empty configuration supplied.");
    }

    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const parent_checkpoint_id = config.configurable?.checkpoint_id;

    if (!thread_id) {
      throw new Error(
        `Missing "thread_id" field in passed "config.configurable".`
      );
    }

    const preparedCheckpoint: Partial<Checkpoint> = copyCheckpoint(checkpoint);
    delete preparedCheckpoint.pending_sends;

    // Serialize checkpoint and metadata for Convex storage
    const serializedCheckpoint = this._serializeRecursively(preparedCheckpoint);
    const serializedMetadata = this._serializeRecursively(metadata);

    // Prepare blobs for channels
    const blobs = [];
    if (checkpoint.channel_versions) {
      for (const [channel, version] of Object.entries(
        checkpoint.channel_versions
      )) {
        const channelValue = (checkpoint as any)[channel];
        if (channelValue !== undefined) {
          const [type, serializedValue] = this.serde.dumpsTyped(channelValue);
          blobs.push({
            thread_id,
            checkpoint_ns,
            channel,
            version: String(version),
            type,
            blob: new Uint8Array(serializedValue).buffer,
            namespace: this.namespace,
          });
        }
      }
    }

    await this.ctx.runMutation(internal.checkpointer.mutations.putCheckpoint, {
      thread_id,
      checkpoint_ns,
      checkpoint_id: checkpoint.id,
      parent_checkpoint_id,
      checkpoint: serializedCheckpoint,
      metadata: serializedMetadata,
      blobs,
      namespace: this.namespace,
    });

    return {
      configurable: {
        thread_id,
        checkpoint_ns,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    if (!config.configurable) {
      throw new Error("Empty configuration supplied.");
    }

    if (!config.configurable?.thread_id) {
      throw new Error("Missing thread_id field in config.configurable.");
    }

    if (!config.configurable?.checkpoint_id) {
      throw new Error("Missing checkpoint_id field in config.configurable.");
    }

    const writeRows = writes.map((write, idx) => {
      const [type, serializedWrite] = this.serde.dumpsTyped(write[1]);
      return {
        thread_id: config.configurable!.thread_id,
        checkpoint_ns: config.configurable!.checkpoint_ns ?? "",
        checkpoint_id: config.configurable!.checkpoint_id,
        task_id: taskId,
        idx,
        channel: write[0],
        type,
        blob: new Uint8Array(serializedWrite).buffer,
        namespace: this.namespace,
      };
    });

    await this.ctx.runMutation(internal.checkpointer.mutations.putWrites, {
      writes: writeRows,
      namespace: this.namespace,
    });
  }
}