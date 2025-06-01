import { requireAuth } from "../utils/helpers";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.projects.queries.get, {
      projectId: args.projectId,
    });

    await ctx.runQuery(api.documents.queries.get, {
      documentId: args.documentId,
    });

    const projectDocumentId = await ctx.db.insert("projectDocuments", {
      projectId: args.projectId,
      documentId: args.documentId,
      selected: true,
      updatedAt: Date.now(),
    });

    return projectDocumentId;
  },
});

export const createMultiple = mutation({
  args: {
    projectId: v.id("projects"),
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.projects.queries.get, {
      projectId: args.projectId,
    });

    await Promise.all(args.documentIds.map(async (documentId) => {
      await ctx.runMutation(api.projectDocuments.mutations.create, {
        projectId: args.projectId,
        documentId: documentId,
      });
    }));

    return true;
  },
});

export const update = mutation({
  args: {
    projectDocumentId: v.id("projectDocuments"),
    update: v.object({
      selected: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(
      api.projectDocuments.queries.get,
      {
        projectDocumentId: args.projectDocumentId,
      }
    );

    await ctx.db.patch(args.projectDocumentId, {
      ...args.update,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const remove = mutation({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocument = await ctx.runQuery(
      api.projectDocuments.queries.get,
      {
        projectDocumentId: args.projectDocumentId,
      }
    );

    // Delete the associated document
    await ctx.runMutation(api.documents.mutations.remove, {
      documentId: projectDocument.document._id,
    });

    // Delete the project document
    await ctx.db.delete(args.projectDocumentId);

    return true;
  },
});

export const toggleSelect = mutation({
  args: {
    projectId: v.id("projects"),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.projects.queries.get, {
      projectId: args.projectId,
    });

    const projectDocuments = await ctx.db
      .query("projectDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    await Promise.all(
      projectDocuments.map((projectDocument) =>
        ctx.runMutation(api.projectDocuments.mutations.update, {
          projectDocumentId: projectDocument._id,
          update: { selected: args.selected },
        })
      )
    );

    return true;
  },
});
