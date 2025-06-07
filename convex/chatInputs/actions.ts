import { parsedConfig } from "../langchain/models";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

export const getModels = action({
  args: {
    chatId: v.union(v.id("chats"), v.literal("new")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    selectedModel: typeof parsedConfig.model_list[number];
    models: typeof parsedConfig.model_list;
  }> => {
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId: args.chatId,
    });

    let selectedModel = parsedConfig.model_list.find((model) => model.model_name === chatInput.model);
    if (!selectedModel) {
      selectedModel = parsedConfig.model_list[0];
    }
    return {
      selectedModel,
      models: parsedConfig.model_list,
    };
  },
});
