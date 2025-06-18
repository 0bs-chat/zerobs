import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
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

const canRunMutation = (
  ctx: ActionCtx | MutationCtx | QueryCtx,
): ctx is MutationCtx | ActionCtx => {
  return ["runMutation", "runAction"].every((key) => key in ctx);
};

export class ConvexCheckpointSaver extends BaseCheckpointSaver {
  ctx: ActionCtx | MutationCtx | QueryCtx;
  namespace: string;

  constructor(
    ctx: ActionCtx | MutationCtx | QueryCtx,
    namespace: string = "default",
    serde?: SerializerProtocol,
  ) {
    super(serde);
    this.ctx = ctx;
    this.namespace = namespace;
  }

  private _serializeToConvexAny(value: any): [string, string | ArrayBuffer] {
    const [type, serialized] = this.serde.dumpsTyped(value);
    if (serialized instanceof Uint8Array) {
      return [type, serialized.buffer];
    }
    return [type, serialized];
  }

  private _serializeToConvexBytes(value: any): {
    type: string;
    blob: ArrayBuffer;
  } {
    const [type, serializedData] = this.serde.dumpsTyped(value);
    if (serializedData instanceof Uint8Array) {
      return { type, blob: serializedData.buffer };
    } else {
      // Assuming string data (e.g., JSON) needs to be text-encoded for v.bytes()
      return { type, blob: new TextEncoder().encode(serializedData).buffer };
    }
  }

  private async _deserializeFromConvexAny(
    dbTuple: [string, string | ArrayBuffer],
  ): Promise<any> {
    const [type, data] = dbTuple;
    if (data instanceof ArrayBuffer) {
      return this.serde.loadsTyped(type, new Uint8Array(data));
    } else {
      return this.serde.loadsTyped(type, data);
    }
  }

  private async _deserializeFromConvexBytes(
    dbType: string | undefined,
    dbBlob: ArrayBuffer,
  ): Promise<any> {
    const effectiveType = dbType ?? "json";
    if (effectiveType === "bytes") {
      return this.serde.loadsTyped(effectiveType, new Uint8Array(dbBlob));
    } else {
      return this.serde.loadsTyped(
        effectiveType,
        new TextDecoder().decode(dbBlob),
      );
    }
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
    const checkpoint = await this.ctx.runQuery(
      internal.checkpointer.queries.getCheckpoint,
      {
        thread_id,
        checkpoint_ns,
        checkpoint_id,
        namespace: this.namespace,
      },
    );

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
      },
    );

    const pendingWrites = await Promise.all(
      pendingWritesData.map(async (write) => {
        const deserializedValue = await this._deserializeFromConvexBytes(
          write.type,
          write.blob,
        );
        return [write.task_id, write.channel, deserializedValue] as [
          string,
          string,
          unknown,
        ];
      }),
    );

    // Get pending sends
    const pendingSendsData = await this.ctx.runQuery(
      internal.checkpointer.queries.getPendingSends,
      {
        thread_id: checkpoint.thread_id,
        checkpoint_ns: checkpoint.checkpoint_ns,
        parent_checkpoint_id: checkpoint.parent_checkpoint_id,
        namespace: this.namespace,
      },
    );

    const pending_sends = await Promise.all(
      pendingSendsData.map((send) =>
        this._deserializeFromConvexBytes(send.type, send.blob),
      ),
    );

    // Reconstruct the checkpoint with channel values
    const deserializedCheckpointCore = await this._deserializeFromConvexAny(
      checkpoint.checkpoint as [string, string | ArrayBuffer],
    );

    const channelValues = await this.ctx.runQuery(
      internal.checkpointer.queries.getChannelValues,
      {
        thread_id: checkpoint.thread_id,
        checkpoint_ns: checkpoint.checkpoint_ns,
        channel_versions: checkpoint.checkpoint.channel_versions || {},
        namespace: this.namespace,
      },
    );

    const updatedCheckpoint = {
      ...deserializedCheckpointCore,
      pending_sends,
    } as Checkpoint;

    // Add channel values to checkpoint
    if (channelValues.length > 0) {
      const channelData: Record<string, unknown> = {};
      for (const channelValue of channelValues) {
        if (channelValue.blob) {
          channelData[channelValue.channel] =
            await this._deserializeFromConvexBytes(
              channelValue.type,
              channelValue.blob,
            );
        }
      }
      Object.assign(updatedCheckpoint, channelData);
    }

    return {
      checkpoint: updatedCheckpoint,
      config: finalConfig,
      metadata: checkpoint.metadata as CheckpointMetadata,
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
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const { limit, before, filter } = options ?? {};
    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";

    if (!thread_id) {
      return;
    }

    const checkpoints = await this.ctx.runQuery(
      internal.checkpointer.queries.listCheckpoints,
      {
        thread_id,
        checkpoint_ns,
        filter: filter || {},
        before: before?.configurable?.checkpoint_id,
        limit,
        namespace: this.namespace,
      },
    );

    for (const checkpoint of checkpoints) {
      // Get pending writes
      const pendingWritesData = await this.ctx.runQuery(
        internal.checkpointer.queries.getPendingWrites,
        {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          checkpoint_id: checkpoint.checkpoint_id,
          namespace: this.namespace,
        },
      );

      const pendingWrites = await Promise.all(
        pendingWritesData.map(async (write) => {
          const deserializedValue = await this._deserializeFromConvexBytes(
            write.type,
            write.blob,
          );
          return [write.task_id, write.channel, deserializedValue] as [
            string,
            string,
            unknown,
          ];
        }),
      );

      // Get pending sends
      const pendingSendsData = await this.ctx.runQuery(
        internal.checkpointer.queries.getPendingSends,
        {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          parent_checkpoint_id: checkpoint.parent_checkpoint_id,
          namespace: this.namespace,
        },
      );

      const pending_sends = await Promise.all(
        pendingSendsData.map((send) =>
          this._deserializeFromConvexBytes(send.type, send.blob),
        ),
      );

      // Get channel values
      const deserializedCheckpointCore = await this._deserializeFromConvexAny(
        checkpoint.checkpoint as [string, string | ArrayBuffer],
      );
      const channelValues = await this.ctx.runQuery(
        internal.checkpointer.queries.getChannelValues,
        {
          thread_id: checkpoint.thread_id,
          checkpoint_ns: checkpoint.checkpoint_ns,
          channel_versions: checkpoint.checkpoint.channel_versions || {},
          namespace: this.namespace,
        },
      );

      const updatedCheckpoint = {
        ...deserializedCheckpointCore,
        pending_sends,
      } as Checkpoint;

      // Add channel values to checkpoint
      if (channelValues.length > 0) {
        const channelData: Record<string, unknown> = {};
        for (const channelValue of channelValues) {
          if (channelValue.blob) {
            channelData[channelValue.channel] =
              await this._deserializeFromConvexBytes(
                channelValue.type,
                channelValue.blob,
              );
          }
        }
        Object.assign(updatedCheckpoint, channelData);
      }

      yield {
        config: {
          configurable: {
            thread_id: checkpoint.thread_id,
            checkpoint_ns: checkpoint.checkpoint_ns,
            checkpoint_id: checkpoint.checkpoint_id,
          },
        },
        checkpoint: updatedCheckpoint,
        metadata: checkpoint.metadata as CheckpointMetadata,
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
    metadata: CheckpointMetadata,
  ): Promise<RunnableConfig> {
    if (!config.configurable) {
      throw new Error("Empty configuration supplied.");
    }

    if (!canRunMutation(this.ctx)) {
      throw new Error("QueryCtx does not support put.");
    }

    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const parent_checkpoint_id = config.configurable?.checkpoint_id;

    if (!thread_id) {
      throw new Error(
        `Missing "thread_id" field in passed "config.configurable".`,
      );
    }

    const preparedCheckpoint: Partial<Checkpoint> = copyCheckpoint(checkpoint);
    delete preparedCheckpoint.pending_sends;

    // Serialize checkpoint and metadata for Convex storage
    const finalSerializedCheckpoint =
      this._serializeToConvexAny(preparedCheckpoint);
    const finalSerializedMetadata = this._serializeToConvexAny(metadata);

    // Prepare blobs for channels
    const blobs = [];
    if (checkpoint.channel_versions) {
      for (const [channel, version] of Object.entries(
        checkpoint.channel_versions,
      )) {
        const channelValue = (checkpoint as any)[channel];
        if (channelValue !== undefined) {
          const { type: blobType, blob: blobBytes } =
            this._serializeToConvexBytes(channelValue);
          blobs.push({
            thread_id,
            checkpoint_ns,
            channel,
            version: String(version),
            type: blobType,
            blob: blobBytes,
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
      checkpoint: finalSerializedCheckpoint,
      metadata: finalSerializedMetadata,
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
    taskId: string,
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
      const { type: writeType, blob: writeBytes } =
        this._serializeToConvexBytes(write[1]);
      return {
        thread_id: config.configurable!.thread_id,
        checkpoint_ns: config.configurable!.checkpoint_ns ?? "",
        checkpoint_id: config.configurable!.checkpoint_id,
        task_id: taskId,
        idx,
        channel: write[0],
        type: writeType,
        blob: writeBytes,
        namespace: this.namespace,
      };
    });

    if (!canRunMutation(this.ctx)) {
      throw new Error("QueryCtx does not support putWrites.");
    }

    await this.ctx.runMutation(internal.checkpointer.mutations.putWrites, {
      writes: writeRows,
      namespace: this.namespace,
    });
  }
}
