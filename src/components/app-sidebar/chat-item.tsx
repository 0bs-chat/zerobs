import * as React from "react";
import { PinIcon, PinOffIcon, TrashIcon } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { Doc } from "../../../convex/_generated/dataModel";
import { chatHandlers } from "@/hooks/chats/use-chats";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { chatIdAtom } from "@/store/chatStore";

import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
} from "@/components/ui/context-menu";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatItemProps {
	chat: Doc<"chats">;
	isPinned: boolean;
	onClick?: () => void;
}

export const ChatItem = React.forwardRef<HTMLDivElement, ChatItemProps>(
	function ChatItem({ chat, isPinned }, ref) {
		const {
			handleNavigate,
			handlePin,
			handleUnpin,
			handleDelete,
			handleSelect,
		} = chatHandlers();
		const currentChatId = useAtomValue(chatIdAtom);
		const isSelected = currentChatId === chat._id;
		const isMobile = useIsMobile();
		// Rename dialog state
		const [renameOpen, setRenameOpen] = React.useState(false);
		const [newName, setNewName] = React.useState(chat.name);
		const [loading, setLoading] = React.useState(false);
		const { mutateAsync: updateChatMutation } = useMutation({
			mutationFn: useConvexMutation(api.chats.mutations.update),
		});

		const handleRename = async (e?: React.FormEvent) => {
			if (e) e.preventDefault();
			setLoading(true);
			try {
				await updateChatMutation({
					chatId: chat._id,
					updates: { name: newName },
				});
				setRenameOpen(false);
			} finally {
				setLoading(false);
			}
		};

		React.useEffect(() => {
			setNewName(chat.name);
		}, [chat.name]);

		return (
			<>
				<ContextMenu>
					<ContextMenuTrigger asChild>
						<SidebarMenuButton
							key={chat._id}
							className={cn("py-2 group/item cursor-pointer w-full h-full")}
							asChild
							onClick={(e) => {
								e.stopPropagation();
								handleNavigate(chat._id);
								handleSelect(chat._id);
							}}
						>
							<div
								ref={ref}
								className={cn(
									"relative flex w-full items-center isolate justify-between overflow-hidden rounded-md",
									isSelected && "bg-secondary/50",
								)}
							>
								<span
									className={cn(
										"truncate",
										isSelected ? "text-foreground" : "text-foreground/75",
									)}
									title={chat.name}
								>
									{chat.name}
								</span>
								<div className="absolute inset-y-0 right-0 flex items-center justify-end bg-gradient-to-l gap-0 from-background via-background/80 to-transparent pl-8 pr-1 text-muted-foreground transition-transform duration-200 group-hover/item:translate-x-0 translate-x-full z-50">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 p-0 text-muted-foreground hover:text-secondary-foreground cursor-pointer"
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											isPinned ? handleUnpin(chat._id) : handlePin(chat._id);
										}}
										aria-label={isPinned ? "Unpin chat" : "Pin chat"}
									>
										{isPinned ? (
											<PinOffIcon className="h-4 w-4" />
										) : (
											<PinIcon className="h-4 w-4" />
										)}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											handleDelete(chat._id);
										}}
										aria-label="Delete chat"
									>
										<TrashIcon className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</SidebarMenuButton>
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem onClick={() => setRenameOpen(true)}>
							Rename
						</ContextMenuItem>
						{isMobile && (
							<>
								<ContextMenuItem onClick={() => handleDelete(chat._id)}>
									Delete
								</ContextMenuItem>
								<ContextMenuItem onClick={() => handlePin(chat._id)}>
									{isPinned ? "Unpin" : "Pin"}
								</ContextMenuItem>
							</>
						)}
					</ContextMenuContent>
				</ContextMenu>
				<Dialog open={renameOpen} onOpenChange={setRenameOpen}>
					<DialogContent>
						<form onSubmit={handleRename} className="space-y-4">
							<DialogHeader>
								<DialogTitle>Rename Chat</DialogTitle>
								<DialogDescription>
									Enter a new name for this chat.
								</DialogDescription>
							</DialogHeader>
							<Input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								autoFocus
								disabled={loading}
								maxLength={100}
								placeholder="Chat name"
							/>
							<DialogFooter>
								<Button
									type="button"
									variant="ghost"
									onClick={() => setRenameOpen(false)}
									disabled={loading}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={loading || !newName.trim()}>
									{loading ? "Renaming..." : "Rename"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</>
		);
	},
);
