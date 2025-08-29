import { crud } from "convex-helpers/server/crud";
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "mcps");

export const { create: createPerChatMcp, read: readPerChatMcp, update: updatePerChatMcp, destroy: destroyPerChatMcp } = crud(schema, "perChatMcps");

export const getAssignedMachineName = internalQuery({
  args: {
    mcpId: v.id("mcps"),
    chatId: v.id("chats"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("perChatMcps")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .filter((q) => q.eq(q.field("mcpId"), args.mcpId))
      .first();

    return assignment?.machineId || null;
  },
});

export const getUnassignedMachineNames = internalQuery({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const unassigned = await ctx.db
      .query("perChatMcps")
      .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
      .filter((q) => q.eq(q.field("chatId"), undefined))
      .collect();

    return unassigned.map((assignment) => assignment.machineId);
  },
});

export const countUnassignedPerChatMcps = internalQuery({
  args: {
    mcpId: v.id("mcps"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const unassignedMachines = await ctx.db
      .query("perChatMcps")
      .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
      .filter((q) => q.eq(q.field("chatId"), undefined))
      .collect();

    return unassignedMachines.length;
  },
});