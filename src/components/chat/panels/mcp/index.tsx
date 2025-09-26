import { MCPCard } from "./mcp-card";
import {
	useMCPsData,
	useMCPMutations,
	getMcpAppData,
} from "@/hooks/chats/use-mcp";
import { MCPDialog } from "./mcp-dialog";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAtom } from "jotai";
import { mcpToolsAtom } from "@/store/chatStore";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const MCPPanel = () => {
	const { mcps } = useMCPsData();
	const { handleToggleMCP, handleDeleteMCP } = useMCPMutations();
	const [mcpTools, setMcpTools] = useAtom(mcpToolsAtom);
	const getMCPToolsAction = useAction(api.mcps.tools.getMCPToolsPreview);

	// Fetch all MCP tools when MCPs change
	useEffect(() => {
		if (!mcps || mcps.length === 0) return;

		const enabledMcpsWithUrl = mcps.filter((mcp) => {
			const { url, status } = getMcpAppData(mcp);
			return mcp.enabled && url && status === "created";
		});

		if (enabledMcpsWithUrl.length === 0) return;

		const mcpIds = enabledMcpsWithUrl.map((mcp) => mcp._id);

		// Only fetch if we don't already have data for these MCPs
		const needsFetch = mcpIds.some((id) => !(id in mcpTools));
		if (!needsFetch) return;

		getMCPToolsAction({ mcpIds })
			.then((batchResults) => {
				setMcpTools((prev) => ({
					...prev,
					...batchResults,
				}));
			})
			.catch((error) => {
				console.error("Error fetching MCP tools batch:", error);
				// Set error state for all requested MCPs
				const errorResults = mcpIds.reduce(
					(acc, mcpId) => {
						acc[mcpId] = {
							tools: [],
							error:
								error instanceof Error
									? error.message
									: "Failed to fetch tools",
						};
						return acc;
					},
					{} as typeof mcpTools,
				);

				setMcpTools((prev) => ({
					...prev,
					...errorResults,
				}));
			});
	}, [mcps, getMCPToolsAction, mcpTools, setMcpTools]);

	return (
		<div className="flex flex-col gap-3 h-full">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold">MCPs</h2>
				<div className="flex gap-2 items-center">
					<MCPDialog />
				</div>
			</div>

			<ScrollArea
				type="always"
				className="flex-grow h-[calc(100vh-10rem)] pr-0"
			>
				<div className="flex flex-col gap-2 pb-4">
					{mcps?.map((mcp) => (
						<MCPCard
							key={mcp._id}
							mcp={mcp}
							status={getMcpAppData(mcp).status || "error"}
							onStartStop={handleToggleMCP}
							onDelete={handleDeleteMCP}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	);
};
