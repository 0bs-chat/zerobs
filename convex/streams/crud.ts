import { crud } from "convex-helpers/server/crud";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "streams");

export const {
  create: createStreamChunk,
  read: readStreamChunk,
  update: updateStreamChunk,
  destroy: destroyStreamChunk,
} = crud(schema, "streamChunks");
