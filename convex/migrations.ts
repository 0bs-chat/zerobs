import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);

export const setDefaultValue = migrations.define({
  table: "chatMessages",
  migrateOne: async (ctx, doc) => {
    if (doc.minimized === undefined) {
      await ctx.db.patch(doc._id, { minimized: false });
    }
  },
});

export const addEnabledFieldToApiKeys = migrations.define({
  table: "apiKeys",
  migrateOne: async (ctx, doc) => {
    if (doc.enabled === undefined) {
      await ctx.db.patch(doc._id, { enabled: true });
    }
  },
});

// Document with ID "jd709j6fmv0q9tg4yftcxbj8a57khj7k" in table "chats" does not match the schema: Object is missing the required field `enabledToolkits`. Consider wrapping the field validator in `v.optional(...)` if this is expected.

// Object: {artifacts: false, conductorMode: false, documents: [], model: "gemini-2.5-flash-thinking", name: "Python 3D Cube Image Reader", orchestratorMode: false, pinned: false, projectId: null, public: false, reasoningEffort: "low", text: "", updatedAt: 1752233596292.0, userId: "kn7bvkcyfb88f3rfm0dnmrt69d7kg4h2", webSearch: false}
// Validator: v.object({artifacts: v.boolean(), conductorMode: v.boolean(), documents: v.array(v.id("documents")), enabledToolkits: v.array(v.string()), model: v.string(), name: v.string(), orchestratorMode: v.boolean(), pinned: v.boolean(), projectId: v.union(v.id("projects"), v.null()), public: v.boolean(), reasoningEffort: v.union(v.literal("low"), v.literal("medium"), v.literal("high")), text: v.string(), updatedAt: v.float64(), userId: v.string(), webSearch: v.boolean()})

export const addEnabledToolkitsToChats = migrations.define({
  table: "chats",
  migrateOne: async (ctx, doc) => {
    if (doc.enabledToolkits === undefined) {
      await ctx.db.patch(doc._id, { enabledToolkits: [] });
    }
  },
});

// export const removePerChatFieldFromMcps = migrations.define({
//   table: "mcps",
//   migrateOne: async (ctx, doc) => {
//     // if (doc.perChat !== undefined) {
//     //   await ctx.db.patch(doc._id, { perChat: undefined });
//     // }
//   },
// });

export const runIt = migrations.runner(internal.migrations.addEnabledToolkitsToChats);
// bunx convex run convex/migrations.ts:runIt