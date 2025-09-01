import type { Doc, Id } from "../_generated/dataModel";
import {
  mapStoredMessageToChatMessage,
  type BaseMessage,
  type StoredMessage,
  AIMessage,
  ToolMessage,
  ToolMessage as LangChainToolMessage,
} from "@langchain/core/messages";
import type { AIChunkGroup, ToolChunkGroup } from "../langchain/state";

export type Message = Omit<Doc<"chatMessages">, "message"> & {
  message: BaseMessage;
};

export interface MessageWithBranchInfo {
  message: Omit<Doc<"chatMessages">, "message"> & {
    message: BaseMessage;
  };
  branchIndex: number; // 1-indexed for display
  totalBranches: number;
  depth: number;
}

export type MessageGroup = {
  input: MessageWithBranchInfo;
  response: MessageWithBranchInfo[];
};

/**
 * Helpers
 */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(n, max));

const cmpId = (a: Id<"chatMessages">, b: Id<"chatMessages">) => {
  const as = String(a);
  const bs = String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
};

const byCreatedAsc = (a: Doc<"chatMessages">, b: Doc<"chatMessages">) =>
  a._creationTime - b._creationTime || cmpId(a._id, b._id);

// Identify message kinds
const getType = (m: MessageWithBranchInfo) => m.message.message.getType();
const isHuman = (m: MessageWithBranchInfo) => getType(m) === "human";
const isAI = (m: MessageWithBranchInfo) => getType(m) === "ai";
const isTool = (m: MessageWithBranchInfo) => getType(m) === "tool";

const parsedMessageCache = new Map<string, BaseMessage>();


const toBaseMessage = (doc: Doc<"chatMessages">): BaseMessage => {
  const cached = parsedMessageCache.get(doc.message);
  if (cached) return cached;
  const parsed = mapStoredMessageToChatMessage(
    JSON.parse(doc.message) as StoredMessage,
  );
  parsedMessageCache.set(doc.message, parsed);
  return parsed;
};

const wrapDoc = (
  doc: Doc<"chatMessages">,
): Omit<Doc<"chatMessages">, "message"> & { message: BaseMessage } => ({
  ...doc,
  message: toBaseMessage(doc),
});

type Index = {
  byId: Map<Id<"chatMessages">, Doc<"chatMessages">>;
  children: Map<Id<"chatMessages">, Doc<"chatMessages">[]>;
  roots: Doc<"chatMessages">[];
  // O(1) index lookups for latestPath computation
  indexInParent: Map<Id<"chatMessages">, number>;
  rootIndex: Map<Id<"chatMessages">, number>;
};

const indexChatMessages = (messages: Doc<"chatMessages">[]): Index => {
  const byId = new Map<Id<"chatMessages">, Doc<"chatMessages">>();
  for (const m of messages) byId.set(m._id, m);

  const children = new Map<Id<"chatMessages">, Doc<"chatMessages">[]>();
  const roots: Doc<"chatMessages">[] = [];
  const indexInParent = new Map<Id<"chatMessages">, number>();
  const rootIndex = new Map<Id<"chatMessages">, number>();

  // Build adjacency and roots
  for (const m of messages) {
    const p = m.parentId;
    if (p && byId.has(p)) {
      const arr = children.get(p);
      if (arr) arr.push(m);
      else children.set(p, [m]);
    } else {
      roots.push(m);
    }
  }

  // Sort siblings by creation time (natural flow)
  roots.sort(byCreatedAsc);
  for (const [, arr] of children) arr.sort(byCreatedAsc);

  // Fill constant-time index maps
  for (const [, arr] of children) {
    for (let i = 0; i < arr.length; i += 1) {
      indexInParent.set(arr[i]._id, i);
    }
  }
  for (let i = 0; i < roots.length; i += 1) {
    rootIndex.set(roots[i]._id, i);
  }

  return { byId, children, roots, indexInParent, rootIndex };
};

export const buildThreadFromMessages = (
  messages: Doc<"chatMessages">[],
  path: number[],
  idxOverride?: Index,
): MessageWithBranchInfo[] => {
  if (messages.length === 0) return [];

  const idx = idxOverride ?? indexChatMessages(messages);
  const result: MessageWithBranchInfo[] = [];

  let current = idx.roots;
  let depth = 0;

  while (current.length > 0) {
    const desired = path?.[depth] ?? current.length - 1; // default to newest created
    const i = clamp(desired, 0, current.length - 1);
    const selectedNode = current[i];

    result.push({
      message: wrapDoc(selectedNode),
      branchIndex: i + 1,
      totalBranches: current.length,
      depth,
    });

    // Get children of the selected node
    current = idx.children.get(selectedNode._id) ?? [];
    
    // Include ALL children when there are multiple (this captures tool messages)
    if (current.length > 1) {
      // Add all children at this level
      for (const child of current) {
        result.push({
          message: wrapDoc(child),
          branchIndex: 1, // All are part of the same conversation flow
          totalBranches: 1,
          depth: depth + 1,
        });
      }
      // Continue from the last child (usually the final AI response)
      const lastChild = current[current.length - 1];
      current = idx.children.get(lastChild._id) ?? [];
    } else if (current.length === 1) {
      // Single child - ADD the child to result and continue
      const desired = path?.[depth + 1] ?? 0;
      const i = clamp(desired, 0, current.length - 1);
      const childMessage = current[i];

      // Add the child message to the result
      result.push({
        message: wrapDoc(childMessage),
        branchIndex: i + 1,
        totalBranches: current.length,
        depth: depth + 1,
      });

      // Continue with this child's children
      current = idx.children.get(childMessage._id) ?? [];
      depth += 1; // Increment depth here since we added the child
      continue; // Skip the depth increment at the end of the loop
    }
    
    depth += 1;
  }

  return result;
};

export const groupMessages = (
  currentThread: MessageWithBranchInfo[],
): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  let group: MessageGroup | null = null;
  // Track last AI for O(1) tool association
  let lastAI: MessageWithBranchInfo | null = null;

  for (const item of currentThread) {
    if (isHuman(item)) {
      if (group) groups.push(group);
      group = { input: item, response: [] };
      lastAI = null;
      continue;
    }

    if (!group) {
      // Ignore leading AI/tool/other messages without a human input
      continue;
    }

    if (isAI(item)) {
      group.response.push(item);
      lastAI = item;
      continue;
    }

    if (isTool(item) && lastAI) {
      const ai = lastAI.message.message as AIMessage;
      const tool = item.message.message as ToolMessage;
      const tc = ai.tool_calls?.find((t) => t.id === tool.tool_call_id);
      if (tc) {
        item.message.message.additional_kwargs = {
          ...item.message.message.additional_kwargs,
          input: tc.args,
        };
      }
    }

    // Non-AI responses (tool/system/other) are appended as part of response
    group.response.push(item);
  }

  if (group) groups.push(group);
  return groups;
};

// O(depth) latest path computation using precomputed indices
const computeLatestPath = (
  idx: Index,
  latestMessage: Doc<"chatMessages">,
): number[] => {
  const latestPath: number[] = [];
  const visited = new Set<Id<"chatMessages">>();
  let current: Doc<"chatMessages"> | undefined = latestMessage;

  while (current && !visited.has(current._id)) {
    visited.add(current._id);
    const p = current.parentId;
    if (p && idx.byId.has(p)) {
      // index among parent's children
      latestPath.push(idx.indexInParent.get(current._id) ?? 0);
      current = idx.byId.get(p);
    } else {
      // current is a root (parent missing or not loaded)
      latestPath.push(idx.rootIndex.get(current._id) ?? 0);
      current = undefined;
    }
  }
  latestPath.reverse();
  return latestPath;
};


export const buildThreadAndGroups = (
  messages: Doc<"chatMessages">[],
  path: number[],
): { groups: MessageGroup[]; latestPath: number[] } => {
  if (messages.length === 0) {
    return { groups: [], latestPath: [] };
  }

  const idx = indexChatMessages(messages);
  const thread = buildThreadFromMessages(messages, path, idx);
  const groups = groupMessages(thread);

  // Compute latest path using O(depth) lookups
  const latestMessage = messages[messages.length - 1];
  const latestPath = computeLatestPath(idx, latestMessage);

  return { groups, latestPath };
};

export function getThreadFromMessage(
  leafMessage: Doc<"chatMessages">,
  messages: Doc<"chatMessages">[],
): Message[] {
  const byId = new Map<Id<"chatMessages">, Doc<"chatMessages">>();
  for (const m of messages) byId.set(m._id, m);

  const chain: Doc<"chatMessages">[] = [];
  let current: Doc<"chatMessages"> | undefined = leafMessage;

  while (current) {
    chain.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain.reverse().map((m) => ({ ...m, message: toBaseMessage(m) }));
}

export function groupStreamChunks(chunks: (AIChunkGroup | ToolChunkGroup)[]): (AIChunkGroup | ToolChunkGroup)[] {
  const groups: (AIChunkGroup | ToolChunkGroup)[] = [];
  let currentGroup: (AIChunkGroup | ToolChunkGroup) | null = null;

  for (const chunk of chunks) {
    if (chunk.type === "ai") {
      if (currentGroup?.type === "ai") {
        currentGroup.content += chunk.content;
        if (chunk.reasoning) {
          currentGroup.reasoning = (currentGroup.reasoning ?? "") + chunk.reasoning;
        }
      } else {
        currentGroup = { ...chunk };
        groups.push(currentGroup);
      }
    } else if (chunk.type === "tool") {
      currentGroup = chunk;
      groups.push(currentGroup);
    }
  }

  return groups;
}

export function convertChunksToLangChainMessages(
  groups: (AIChunkGroup | ToolChunkGroup)[]
): (AIMessage | LangChainToolMessage)[] {
  const completedIds = new Set(
    groups
      .filter((c) => c.type === "tool" && c.isComplete)
      .map((c) => (c as ToolChunkGroup).toolCallId),
  );

  return groups
    .map((chunk) => {
      if (chunk.type === "ai") {
        return new AIMessage({
          content: chunk.content,
          additional_kwargs: chunk.reasoning
            ? { reasoning_content: chunk.reasoning }
            : {},
        });
      }
      
      if (chunk.type === "tool") {
        if (chunk.isComplete) {
          return new LangChainToolMessage({
            content: chunk.output as string,
            name: chunk.toolName,
            tool_call_id: chunk.toolCallId,
            additional_kwargs: {
              input: JSON.parse(JSON.stringify(chunk.input)),
              is_complete: true,
            },
          });
        }
        
        if (!completedIds.has(chunk.toolCallId)) {
          return new LangChainToolMessage({
            name: chunk.toolName,
            tool_call_id: chunk.toolCallId,
            content: "",
            additional_kwargs: {
              input: JSON.parse(JSON.stringify(chunk.input)),
              is_complete: false,
            },
          });
        }
      }
      
      return undefined;
    })
    .filter(Boolean) as (AIMessage | LangChainToolMessage)[];
}

export function processBufferToMessages(accumulatedBuffer: string[]): (AIMessage | LangChainToolMessage)[] {
  if (accumulatedBuffer.length === 0) return [];
  const chunks = accumulatedBuffer.map(chunkStr => JSON.parse(chunkStr) as (AIChunkGroup | ToolChunkGroup));
  const groups = groupStreamChunks(chunks);
  return convertChunksToLangChainMessages(groups);
}