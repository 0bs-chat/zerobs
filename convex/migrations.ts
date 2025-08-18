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

// export const addEnabledToolkitsToChats = migrations.define({
//   table: "chats",
//   migrateOne: async (ctx, doc) => {
//     if (doc.enabledToolkits === undefined) {
//       await ctx.db.patch(doc._id, { enabledToolkits: [] });
//     }
//   },
// });

// export const removePerChatFieldFromMcps = migrations.define({
//   table: "mcps",
//   migrateOne: async (ctx, doc) => {
//     // if (doc.perChat !== undefined) {
//     //   await ctx.db.patch(doc._id, { perChat: undefined });
//     // }
//   },
// });

// set undefined perChat to false
export const setUndefinedPerChatToFalse = migrations.define({
  table: "mcps",
  migrateOne: async (ctx, doc) => {
    if (doc.perChat === undefined) {
      await ctx.db.patch(doc._id, { perChat: false });
    }
  },
});

// export const setUndefinedEnabledToolkitsToEmptyArray = migrations.define({
//   table: "chats",
//   migrateOne: async (ctx, doc) => {
//     if (doc.enabledToolkits !== undefined) {
//       await ctx.db.patch(doc._id, { enabledToolkits: undefined });
//     }
//   },
// });

// export const setEnabledToolkitsToUndefined = migrations.define({
//   table: "chats",
//   migrateOne: async (ctx, doc) => {
//     if (doc.enabledToolkits !== undefined) {
//       await ctx.db.patch(doc._id, { enabledToolkits: undefined });
//     }
//   },
// });
// Document with ID "jd702zsj2c0zet7m53z5szqwrd7mqmvq" in table "chats" does not match the schema: Object contains extra field `enabledToolkits` that is not in the validator.

// Object: {artifacts: true, conductorMode: false, documents: [], enabledToolkits: [], model: "claude-4", name: "Business Case Interview Task Artifact", orchestratorMode: true, pinned: false, projectId: null, public: false, reasoningEffort: "high", text: "", updatedAt: 1753860008341.0, userId: "kn7cxf0ye4t9b5f93jek6k15ed7kn97n", webSearch: true}
// Validator: v.object({artifacts: v.boolean(), conductorMode: v.boolean(), documents: v.array(v.id("documents")), model: v.string(), name: v.string(), orchestratorMode: v.boolean(), pinned: v.boolean(), projectId: v.union(v.id("projects"), v.null()), public: v.boolean(), reasoningEffort: v.union(v.literal("low"), v.literal("medium"), v.literal("high")), text: v.string(), updatedAt: v.float64(), userId: v.string(), webSearch: v.boolean()})

// Document with ID "js70sze8nt57492bjy2fee12ex7kge3n" in table "mcps" does not match the schema: Object is missing the required field `perChat`. Consider wrapping the field validator in `v.optional(...)` if this is expected.

// Object: {enabled: false, env: {}, name: "c7", status: "created", type: "http", updatedAt: 1752309074234.0, url: "https://mcp.context7.com/mcp", userId: "kn7324etnk2r2x5wb6yhe6jvq17kg2j3"}
// Validator: v.object({command: v.optional(v.string()), dockerCommand: v.optional(v.string()), dockerImage: v.optional(v.string()), dockerPort: v.optional(v.float64()), enabled: v.boolean(), env: v.record(v.string(), v.string()), name: v.string(), perChat: v.boolean(), status: v.union(v.literal("creating"), v.literal("created"), v.literal("error")), template: v.optional(v.string()), type: v.union(v.literal("http"), v.literal("stdio"), v.literal("docker")), updatedAt: v.float64(), url: v.optional(v.string()), userId: v.optional(v.string())})

export const setPerChatToFalse = migrations.define({
  table: "mcps",
  migrateOne: async (ctx, doc) => {
    if (doc.perChat === undefined) {
      await ctx.db.patch(doc._id, { perChat: false });
    }
  },
});

export const runIt = migrations.runner(internal.migrations.setPerChatToFalse);
// bunx convex run convex/migrations.ts:runIt
