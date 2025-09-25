import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type {
	ToolChunkGroup,
	AIChunkGroup,
} from "../../../convex/langchain/state";
import {
	AIMessage,
	mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import {
	groupStreamChunks,
	convertChunksToLangChainMessages,
} from "../../../convex/chatMessages/helpers";
import { useConvex } from "convex/react";

export type ChunkGroup = AIChunkGroup | ToolChunkGroup;

export function useStream(chatId: Id<"chats"> | "new") {
	const convex = useConvex();
	const { data: stream } = useQuery({
		...convexQuery(
			api.streams.queries.get,
			chatId !== "new" ? { chatId: chatId as Id<"chats"> } : "skip",
		),
	});
	const [chunksResult, setChunksResult] = useState<Doc<"streamChunks">[]>([]);
	const lastChunkTimeRef = useRef(0);

	useEffect(() => {
		setChunksResult([]);
		lastChunkTimeRef.current = 0;
		if (!stream) return;

		const getChunks = async () => {
			const result = await convex.query(api.streams.queries.getChunks, {
				chatId: stream.chatId,
				lastChunkTime: lastChunkTimeRef.current,
			});

			if (result.chunks.length > 0) {
				const lastChunk = result.chunks[result.chunks.length - 1];
				if (lastChunk) {
					lastChunkTimeRef.current = lastChunk._creationTime;
				}
				setChunksResult((prev) => [...prev, ...result.chunks]);
			}
		};

		if (stream.status === "streaming") {
			const intervalId = setInterval(getChunks, 1000);
			return () => clearInterval(intervalId);
		} else if (stream.status === "done") {
			getChunks();
		}
	}, [stream, convex]);

	const groupedChunks = useMemo(() => {
		if (!chunksResult?.length) return [];

		const allChunks = chunksResult.flatMap((chunkDoc) =>
			chunkDoc.chunks.map(
				(chunkStr: string) => JSON.parse(chunkStr) as ChunkGroup,
			),
		);

		return groupStreamChunks(allChunks);
	}, [chunksResult]);

	// Convert chunk groups to LangChain messages
	const langchainMessages = useMemo(() => {
		if (!groupedChunks.length) return [];

		// Use helper function to convert chunks to LangChain messages
		return convertChunksToLangChainMessages(groupedChunks);
	}, [groupedChunks]);

	// Generate planning steps message
	const planningStepsMessage = useMemo(() => {
		if (!stream?.completedSteps || stream.completedSteps.length === 0)
			return null;

		return new AIMessage({
			content: "",
			additional_kwargs: {
				pastSteps: [
					[
						stream.completedSteps[0],
						mapChatMessagesToStoredMessages(langchainMessages),
					],
					...stream.completedSteps.slice(1).map((step: string) => [step, []]),
				],
			},
		});
	}, [stream?.completedSteps, langchainMessages]);

	return {
		status: stream?.status,
		langchainMessages,
		planningStepsMessage,
	};
}
