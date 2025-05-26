import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const project = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
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
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return projects;
  },
});

export const getMultiple = query({
  args: {
    projectIds: v.array(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const projects = await Promise.all(
      args.projectIds.map(async (projectId) => {
        const project = await ctx.db
          .query("projects")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("_id"), projectId))
          .first();

        if (!project) {
          throw new Error("Project not found");
        }

        return project;
      })
    );

    return projects;
  },
});
