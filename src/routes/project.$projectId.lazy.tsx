import { createLazyFileRoute } from "@tanstack/react-router";
import { ProjectDetails } from "@/components/chat/panels/projects/details";
import { ProjectChatList } from "@/components/chat/panels/projects/chat-list";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatInput } from "@/components/chat/input";
import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, newChatAtom } from "@/store/chatStore";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
export const Route = createLazyFileRoute("/project/$projectId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	const setChat = useSetAtom(chatAtom);
	const newChat = useAtomValue(newChatAtom);
	const isMobile = useIsMobile();

	useEffect(() => {
		setChat(newChat);
	}, [newChat, setChat]);

	return (
		<div
			className={`flex flex-col min-w-full gap-4 p-3 overflow-y-auto ${isMobile ? "flex-col-reverse flex pt-14 overflow-y-auto" : "flex-row md:min-w-7xl md:h-[calc(100vh-24rem)] md:m-auto md:overflow-hidden"}`}
		>
			<div className="flex flex-col gap-4 h-auto">
				{isMobile && (
					<div className="text-xl font-semibold">Chat with the project</div>
				)}
				<ChatInput />
				<div className={`flex flex-col ${isMobile ? "h-96" : "h-auto"}`}>
					<ProjectChatList projectId={projectId as Id<"projects">} />
				</div>
			</div>
			{isMobile && <div className="w-full border border-border" />}
			<div className="w-full ">
				<ProjectDetails projectId={projectId as Id<"projects">} />
			</div>
		</div>
	);
}
