import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
	buildThreadAndGroups,
	type MessageGroup,
	type MessageWithBranchInfo,
	type BranchPath,
} from "../../../convex/chatMessages/helpers";
import { useStreamAtom, currentThreadAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { useStream } from "./use-stream";

export type { MessageGroup, MessageWithBranchInfo, BranchPath };

let globalBranchPath: BranchPath = [];
let forceUpdateFn: (() => void) | null = null;

export const useMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
	const setCurrentThread = useSetAtom(currentThreadAtom);
	const setUseStreamAtom = useSetAtom(useStreamAtom);
	const [counter, setCounter] = useState(0);

	// Register the force update function
	forceUpdateFn = () => setCounter((c) => c + 1);

	const {
		data: messages,
		isLoading,
		isError: isMessagesError,
		error: messagesError,
	} = useQuery({
		...convexQuery(
			api.chatMessages.queries.get,
			chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
		),
		enabled: chatId !== "new",
	});

	const messageGroups = useMemo(
		() => (messages ? buildThreadAndGroups(messages, globalBranchPath) : []),
		[messages, counter],
	);

	const streamData = useStream(chatId);

	useEffect(() => {
		setCurrentThread(messageGroups);
		setUseStreamAtom(streamData);
	}, [
		messageGroups,
		JSON.stringify(streamData),
		setCurrentThread,
		setUseStreamAtom,
	]);

	useEffect(() => {
		// Reset branch path when chat changes
		globalBranchPath = [];
		setCounter((c) => c + 1);
	}, [chatId]);

	return {
		isLoading: isLoading,
		isEmpty: messageGroups.length === 0,
		isError: isMessagesError,
		error: messagesError,
		isStreamError: Boolean(streamData?.isError),
		streamError: streamData?.error,
	};
};

export const useNavigateBranch = () => {
	return useCallback(
		(
			depth: number,
			direction: "prev" | "next" | number,
			totalBranches: number,
		) => {
			if (typeof direction === "number") {
				globalBranchPath[depth] = direction;
			} else {
				const currentIndex = globalBranchPath[depth] ?? totalBranches - 1; // Default to current displayed branch
				if (direction === "next") {
					globalBranchPath[depth] = (currentIndex + 1) % totalBranches;
				} else if (direction === "prev") {
					globalBranchPath[depth] =
						(currentIndex - 1 + totalBranches) % totalBranches;
				}
			}
			globalBranchPath.splice(depth + 1);

			if (forceUpdateFn) {
				forceUpdateFn();
			}
		},
		[],
	);
};

export const useChangeBranch = () => {
	return useCallback((depth: number, newBranchIndex: number) => {
		globalBranchPath[depth] = newBranchIndex;
		globalBranchPath.splice(depth + 1);

		if (forceUpdateFn) {
			forceUpdateFn();
		}
	}, []);
};
