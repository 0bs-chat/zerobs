import type { Doc } from "../_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
  mutation,
  query,
  action,
} from "../_generated/server.js";

export const withUser = <Ctx extends QueryCtx | MutationCtx | ActionCtx, Args extends [any] | [], Output>(
  func: (ctx: Ctx & { userId: string }, ...args: Args) => Promise<Output>
): ((ctx: Ctx, ...args: Args) => Promise<Output>) => {
  return async (ctx: Ctx, ...args: Args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        'Unauthenticated call to function requiring authentication'
      );
    }
    return func({ ...ctx, userId: identity.subject }, ...args);
  };
};

export const actionWithUserId = <Args extends [any] | [], Output>(
  func: (ctx: ActionCtx & { userId: string }, ...args: Args) => Promise<Output>
) => {
  return action(withUser(func));
};

export const queryWithUserId = <Args extends [any] | [], Output>(
  func: (ctx: QueryCtx & { userId: string }, ...args: Args) => Promise<Output>
) => {
  return query(withUser(func));
};

export const mutationWithUserId = <Args extends [any] | [], Output>(
  func: (ctx: MutationCtx & { userId: string }, ...args: Args) => Promise<Output>
) => {
  return mutation(withUser(func));
};

export async function getUrl(
  ctx: ActionCtx | MutationCtx,
  key: Doc<"documents">["key"],
) {
  try {
    return await ctx.storage.getUrl(key);
  } catch (error) {
    return key;
  }
}
