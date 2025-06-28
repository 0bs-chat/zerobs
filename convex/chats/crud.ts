import { crud } from "convex-helpers/server/crud";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "chats");

export const {
  create: createMessage,
  read: readMessage,
  update: updateMessage,
  destroy: destroyMessage,
} = crud(schema, "chatMessages");