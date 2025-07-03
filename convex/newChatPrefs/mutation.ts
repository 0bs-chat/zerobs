import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { models } from "../langchain/models";

export const prefsValidator = v.object({
  model: v.optional(v.string()),
  text: v.optional(v.string()),
  reasoningEffort: v.optional(
    v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
  ),
  conductorMode: v.optional(v.boolean()),
  deepSearchMode: v.optional(v.boolean()),
  webSearch: v.optional(v.boolean()),
  artifacts: v.optional(v.boolean()),
  documents: v.optional(v.array(v.id("documents"))),
});

export const create = mutation({
  handler: async (ctx) => {
    await requireAuth(ctx);
    const { userId } = await requireAuth(ctx);

    const existingPrefs = await ctx.db
      .query("newChatPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPrefs) return existingPrefs;

    const prefs = await ctx.db.insert("newChatPrefs", {
      model: models[0].model_name,
      text: "",
      reasoningEffort: "medium",
      conductorMode: false,
      deepSearchMode: false,
      webSearch: false,
      artifacts: false,
      userId,
      documents: [],
    });

    return prefs;
  },
});

export const update = mutation({
  args: {
    updates: prefsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const prefs = await ctx.db
      .query("newChatPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!prefs) throw new Error("Preferences not found");

    const updatedPrefs = await ctx.db.patch(prefs._id, {
      ...args.updates,
    });

    return updatedPrefs;
  },
});
