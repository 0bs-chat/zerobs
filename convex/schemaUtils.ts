import { v } from "convex/values"

export const TextPart = v.object({
    type: v.literal("text"),
    text: v.string()
})

export const ImagePart = v.object({
    type: v.literal("image"),
    image: v.string(),
    mimeType: v.string()
})

export const ReasoningPart = v.object({
    type: v.literal("reasoning"),
    reasoning: v.string(),
    signature: v.optional(v.string()),
    duration: v.optional(v.number()),
    details: v.optional(
        v.array(
            v.object({
                type: v.union(v.literal("text"), v.literal("redacted")),
                text: v.optional(v.string()),
                data: v.optional(v.string()),
                signature: v.optional(v.string())
            })
        )
    )
})

export const FilePart = v.object({
    type: v.literal("file"),
    data: v.string(),
    filename: v.optional(v.string()),
    mimeType: v.optional(v.string())
})

export const ErrorUIPart = v.object({
    type: v.literal("error"),
    error: v.object({
        code: v.string(),
        message: v.string()
    })
})

export const ToolInvocationUIPart = v.object({
    type: v.literal("tool-invocation"),
    toolInvocation: v.object({
        state: v.union(v.literal("call"), v.literal("result"), v.literal("partial-call")),
        args: v.optional(v.any()),
        result: v.optional(v.any()),
        toolCallId: v.string(),
        toolName: v.string(),
        step: v.optional(v.number())
    })
})

export const MessagePart = v.union(
    TextPart,
    ImagePart,
    ReasoningPart,
    FilePart,
    ErrorUIPart,
    ToolInvocationUIPart
)

export const HTTPAIMessage = v.object({
  messageId: v.optional(v.string()),
  role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
  ),
  content: v.optional(v.string()),
  parts: v.array(MessagePart)
})

export const AIMessage = v.object({
  messageId: v.string(),
  role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
  ),
  parts: v.array(MessagePart),
  createdAt: v.number(),
  updatedAt: v.number(),
  metadata: v.object({
      modelId: v.optional(v.string()),
      modelName: v.optional(v.string()),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      serverDurationMs: v.optional(v.number())
  })
})

export const Message = v.object({
  threadId: v.id("threads"),
  messageId: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  parts: v.array(MessagePart),
  createdAt: v.number(),
  updatedAt: v.number(),
  metadata: v.object({
      modelId: v.optional(v.string()),
      modelName: v.optional(v.string()),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      serverDurationMs: v.optional(v.number())
  })
})