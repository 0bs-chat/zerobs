import { requireAuth } from "convex/utils/helpers";
import { query } from "convex/_generated/server";
import { v } from "convex/values";
import { api } from "convex/_generated/api";
import type { Id, Doc } from "convex/_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Doc<"projectDocuments"> & {
      project: Doc<"projects">;
      document: Doc<"documents">;
    }
  > => {
    await requireAuth(ctx);

    const projectDocument = await ctx.db.get(args.projectDocumentId);
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    const project = await ctx.runQuery(api.projects.queries.get, {
      projectId: projectDocument.projectId as Id<"projects">,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const document = await ctx.runQuery(api.documents.queries.get, {
      documentId: projectDocument.documentId as Id<"documents">,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    return {
      ...projectDocument,
      project,
      document,
    };
  },
});

export const getAll = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    projectDocuments: (Doc<"projectDocuments"> & {
      document: Doc<"documents">;
    })[];
    project: Doc<"projects"> | null;
  }> => {
    await requireAuth(ctx);

    const project = await ctx.runQuery(api.projects.queries.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const projectDocuments = await ctx.db
      .query("projectDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .paginate(args.paginationOpts ?? { numItems: 10, cursor: null });
    if (projectDocuments.page.length === 0) {
      return {
        projectDocuments: [],
        project: null,
      };
    }

    const documents = await ctx.runQuery(api.documents.queries.getMultiple, {
      documentIds: projectDocuments.page.map(
        (projectDocument) => projectDocument.documentId,
      ),
    });
    if (!documents) {
      throw new Error("Documents not found");
    }

    const documentsMap = new Map<Id<"documents">, Doc<"documents">>();
    documents.forEach((document: Doc<"documents">) =>
      documentsMap.set(document._id, document),
    );

    const projectDocumentsMap = new Map<
      Id<"projectDocuments">,
      Doc<"projectDocuments"> & { document: Doc<"documents"> }
    >();

    projectDocuments.page.forEach((projectDocument) => {
      const document = documentsMap.get(projectDocument.documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      projectDocumentsMap.set(projectDocument._id, {
        ...projectDocument,
        document,
      });
    });

    return {
      projectDocuments: Array.from(projectDocumentsMap.values()),
      project,
    };
  },
});

export const getMultiple = query({
  args: {
    projectDocumentIds: v.array(v.id("projectDocuments")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    (Doc<"projectDocuments"> & {
      project: Doc<"projects">;
      document: Doc<"documents">;
    })[]
  > => {
    await requireAuth(ctx);

    return await Promise.all(
      args.projectDocumentIds.map(async (projectDocumentId) => {
        const projectDocument = await ctx.runQuery(
          api.projectDocuments.queries.get,
          {
            projectDocumentId,
          },
        );
        if (!projectDocument) {
          throw new Error("Project document not found");
        }

        return projectDocument;
      }),
    );
  },
});

export const getSelected = query({
  args: {
    projectId: v.id("projects"),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocuments = await ctx.db
      .query("projectDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("selected"), args.selected))
      .collect();

    return projectDocuments.map((projectDocument) => projectDocument._id);
  },
});
