// import { mutation } from "../_generated/server";
// import { requireAuth } from "../utils/helpers";
// import { v } from "convex/values";
// import { api } from "../_generated/api";

// export const create = mutation({
//   args: {
//     name: v.string(),
//     description: v.optional(v.string()),
//     systemPrompt: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     const { userId } = await requireAuth(ctx);

//     const newProjectId = await ctx.db.insert("projects", {
//       name: args.name,
//       description: args.description,
//       systemPrompt: args.systemPrompt,
//       userId: userId,
//       updatedAt: Date.now(),
//     });

//     const newProject = await ctx.db.get(newProjectId);

//     if (!newProject) {
//       throw new Error("Project not found");
//     }

//     return newProject;
//   },
// });

// export const update = mutation({
//   args: {
//     projectId: v.id("projects"),
//     updates: v.object({
//       name: v.optional(v.string()),
//       description: v.optional(v.string()),
//       systemPrompt: v.optional(v.string()),
//     }),
//   },
//   handler: async (ctx, args) => {
//     const { userId } = await requireAuth(ctx);

//     const existingProject = await ctx.db
//       .query("projects")
//       .withIndex("by_user", (q) => q.eq("userId", userId))
//       .filter((q) => q.eq(q.field("_id"), args.projectId))
//       .first();

//     if (!existingProject) {
//       throw new Error("Project not found");
//     }

//     await ctx.db.patch(existingProject._id, {
//       ...args.updates,
//       updatedAt: Date.now(),
//     });

//     return true;
//   },
// });

// export const remove = mutation({
//   args: {
//     projectId: v.id("projects"),
//   },
//   handler: async (ctx, args) => {
//     const { userId } = await requireAuth(ctx);

//     const existingProject = await ctx.db
//       .query("projects")
//       .withIndex("by_user", (q) => q.eq("userId", userId))
//       .filter((q) => q.eq(q.field("_id"), args.projectId))
//       .first();

//     if (!existingProject) {
//       throw new Error("Project not found");
//     }

//     // First get all project documents
//     const projectDocuments = await ctx.db
//       .query("projectDocuments")
//       .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
//       .collect();

//     // Delete all project documents
//     await Promise.all(
//       projectDocuments.map((projectDocument) =>
//         ctx.runMutation(api.projectDocuments.mutations.remove, {
//           projectDocumentId: projectDocument._id,
//         })
//       )
//     );

//     // Finally delete the project
//     await ctx.db.delete(args.projectId);

//     return true;
//   },
// });
