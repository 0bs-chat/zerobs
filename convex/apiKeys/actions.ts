import { api, internal } from "../_generated/api";
import { requireAuth } from "../utils/helpers";
import { httpAction } from "../_generated/server";

export const addApiKey = httpAction(async (ctx, request) => {
  await requireAuth(ctx);
  const res = await request.json();
  const key = res.key;
  const value = res.value;

  await ctx.runMutation(internal.apiKeys.mutations.create, {
    key,
    value,
  });

  return new Response(null, {
    status: 200,
  });
});
