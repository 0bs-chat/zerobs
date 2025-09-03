import { internalQuery, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { type Doc } from "../_generated/dataModel";

export const getInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== args.userId) {
      throw new Error("Project not found");
    }

    return project;
  },
});

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<Doc<"projects"> | null> => {
    const { userId } = await requireAuth(ctx);

    return await ctx.runQuery(internal.projects.queries.getInternal, {
      projectId: args.projectId,
      userId: userId,
    });
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return projects;
  },
});
