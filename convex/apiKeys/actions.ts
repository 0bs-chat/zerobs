import { api } from "../_generated/api";
import { requireAuth } from "../utils/helpers";
import { httpAction } from "../_generated/server";

export const addApiKey = httpAction(async (ctx, request) => {
  await requireAuth(ctx);
  const res = await request.json();
  const name = res.name;
  const key = res.key;

  await ctx.runMutation(api.apiKeys.mutations.create, {
    name,
    key,
  });

  return new Response(null, {
    status: 200,
  });
});
