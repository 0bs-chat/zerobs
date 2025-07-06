import { crud } from "convex-helpers/server/crud";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "documents");

export const {
  create: createDocumentVector,
  read: readDocumentVector,
  update: updateDocumentVector,
  destroy: destroyDocumentVector,
} = crud(schema, "documentVectors");
