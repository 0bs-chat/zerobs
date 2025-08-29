import type { Doc, Id } from "../_generated/dataModel";
import {
	mapStoredMessageToChatMessage,
	type BaseMessage,
	type StoredMessage,
	AIMessage,
	ToolMessage,
} from "@langchain/core/messages";

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

// Small LRU cache for parsed BaseMessage to avoid repeated JSON.parse + mapping
const MAX_MESSAGE_CACHE = 2000;
const parsedMessageCache = new Map<string, BaseMessage>();

const getOrSetLRU = (key: string, compute: () => BaseMessage) => {
	const hit = parsedMessageCache.get(key);
	if (hit) {
		// refresh
		parsedMessageCache.delete(key);
		parsedMessageCache.set(key, hit);
		return hit;
	}
	const value = compute();
	parsedMessageCache.set(key, value);
	if (parsedMessageCache.size > MAX_MESSAGE_CACHE) {
		const oldestKey = parsedMessageCache.keys().next().value as string;
		parsedMessageCache.delete(oldestKey);
	}
	return value;
};

const toBaseMessage = (doc: Doc<"chatMessages">): BaseMessage =>
	getOrSetLRU(doc.message, () =>
		mapStoredMessageToChatMessage(JSON.parse(doc.message) as StoredMessage),
	);

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

	// Start from roots, then walk down using `path`.
	let siblings = idx.roots;
	let depth = 0;

	while (siblings.length > 0) {
		const desired = path?.[depth] ?? siblings.length - 1; // newest by default
		const i = clamp(desired, 0, siblings.length - 1);
		const selectedNode = siblings[i];

		// Push the selected node at this depth
		result.push({
			message: wrapDoc(selectedNode),
			branchIndex: i + 1,
			totalBranches: siblings.length,
			depth,
		});

		// Move to children of the selected node
		const children = idx.children.get(selectedNode._id) ?? [];

		if (children.length > 1) {
			// Include ALL children (captures tool and intermediate messages)
			for (let childIndex = 0; childIndex < children.length; childIndex++) {
				const child = children[childIndex];
				result.push({
					message: wrapDoc(child),
					branchIndex: childIndex + 1,
					totalBranches: children.length,
					depth: depth + 1,
				});
			}
			// Continue from the last child's children (usually final AI response)
			const lastChild = children[children.length - 1];
			siblings = idx.children.get(lastChild._id) ?? [];
		} else {
			// 0 or 1 child: just step into that set for the next selection
			siblings = children;
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

const latestByCreation = (
	messages: Doc<"chatMessages">[],
): Doc<"chatMessages"> => {
	let latest = messages[0];
	for (let i = 1; i < messages.length; i += 1) {
		if (byCreatedAsc(latest, messages[i]) < 0) {
			latest = messages[i];
		}
	}
	return latest;
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

	// Compute latest path using truly latest message by creation time
	const latestMessage = latestByCreation(messages);
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
