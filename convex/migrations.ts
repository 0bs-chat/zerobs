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

export const addVibzFieldToChats = migrations.define({
  table: "chats",
  migrateOne: async (ctx, doc) => {
    if (doc.vibz === undefined) {
      await ctx.db.patch(doc._id, { vibz: false });
    }
  },
});

export const runIt = migrations.runner(internal.migrations.addVibzFieldToChats);