import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlanningStep } from "./planning-step";
import { AiMessageContent } from "./ai-message";
import type { MessageGroup } from "../../../../../convex/chatMessages/helpers";
import { AiUtilsBar } from "../utils-bar/ai-utils-bar";
import { ChevronUp, ChevronDown } from "lucide-react";
import { springTransition } from "@/lib/motion";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export const AiMessage = memo(({ group }: { group: MessageGroup }) => {
	const firstResponse = group.response[0];
	const minimized = firstResponse?.message.minimized ?? false;
	const isMobile = useIsMobile();
	const { mutate: toggleMinimized } = useMutation({
		mutationFn: useConvexMutation(api.chatMessages.mutations.toggleMinimized),
	});

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (firstResponse?.message._id) {
			toggleMinimized({ id: firstResponse.message._id });
		}
	};

	// Helper function to render individual message content
	const renderMessageContent = (item: any) => {
		const msg = item.message.message;
		const type = msg?.getType?.();
		const pastSteps = msg?.additional_kwargs?.pastSteps as
			| Array<[string, any[]]>
			| undefined;

		// Check if this is a completed planner message
		const isPlanner = type === "ai" && pastSteps && pastSteps.length > 0;

		// If this is a completed planner message, show the PlanningStep component AND the regular content
		if (isPlanner) {
			return (
				<>
					<PlanningStep message={msg} messageId={item.message._id} />
					<AiMessageContent message={msg} messageId={item.message._id} />
				</>
			);
		}

		// Regular message (AI, tool, or unknown)
		return <AiMessageContent message={msg} messageId={item.message._id} />;
	};

	return (
		<div
			className={`flex flex-col gap-1 group relative ${!minimized ? "" : " opacity-50"}`}
		>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							onClick={handleToggle}
							variant="ghost"
							size="sm"
							className={`z-10 h-8 w-8 cursor-pointer p-1 rounded-md transition-all duration-200
								absolute top-0 left-0 -translate-x-10 
								${!minimized ? "opacity-0 scale-95" : "opacity-100 scale-100"}
								group-hover:opacity-100 group-hover:scale-100`}
							aria-label={!minimized ? "Collapse" : "Expand"}
						>
							{!minimized ? (
								<ChevronUp className="h-8 w-8" />
							) : (
								<ChevronDown className="h-8 w-8" />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left" sideOffset={8}>
						<p className="text-xs">
							{!minimized ? "Minimize message" : "Expand message"}
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<AnimatePresence initial={false}>
				{!minimized && (
					<motion.div
						key="ai-group"
						data-slot="ai-response-group"
						initial="collapsed"
						animate="open"
						exit="collapsed"
						variants={{
							open: { opacity: 1, height: "auto" },
							collapsed: { opacity: 0, height: 0 },
						}}
						transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
						className="overflow-hidden"
					>
						<div className="flex flex-col gap-1">
							{group.response.map((response, index) => {
								return (
									<motion.div
										key={`${response.message._id}-${index}`}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.1, ...springTransition }}
									>
										<div className="flex flex-col gap-1">
											{renderMessageContent(response)}
										</div>
									</motion.div>
								);
							})}
							{group.response.length > 0 && (
								<div
									className={`opacity-0 group-hover:opacity-100 transition-opacity ${isMobile ? "opacity-90" : ""}`}
								>
									<AiUtilsBar input={group.input} response={group.response} />
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

AiMessage.displayName = "AiMessage";
