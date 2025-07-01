import { models } from "./langchain/models";
import { query } from "./_generated/server";
import { requireAuth } from "./utils/helpers";
import { v } from "convex/values";
import {
  models as modelsArray,
  type modelsInterface,
} from "./langchain/models";

export const getModels = query({
  handler: async (ctx) => {
    await requireAuth(ctx);
    return modelsArray as modelsInterface[];
  },
});
