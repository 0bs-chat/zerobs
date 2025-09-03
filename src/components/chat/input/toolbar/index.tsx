import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	PlusIcon,
	ArrowUp,
	PaperclipIcon,
	GithubIcon,
	BrainIcon,
	XIcon,
	FoldersIcon,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { useUploadDocuments } from "@/hooks/chats/use-documents";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtomValue, useSetAtom } from "jotai";
import { chatIdAtom } from "@/store/chatStore";
import { useRef, useState } from "react";
import GitHubDialog from "../github";
import {
	streamStatusAtom,
	newChatAtom,
	chatAtom,
	resizePanelOpenAtom,
	selectedPanelTabAtom,
} from "@/store/chatStore";
import { models } from "../../../../../convex/langchain/models";
import { StopButtonIcon } from "./stop-button-icon";
import { ModelPopover } from "./model-popover";
import { useRouter } from "@tanstack/react-router";
import { AgentPopover } from "./agent-popover";
import { ToolToggles } from "./tool-toggles";
import { useAgentSettings } from "@/hooks/chats/use-agent-settings";
import { useApiKeys } from "@/hooks/use-apikeys";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
	buttonHover,
	smoothTransition,
	scaleIn,
	iconSpinVariants,
} from "@/lib/motion";

export const ToolBar = () => {
	const chatId = useAtomValue(chatIdAtom);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const { mutate: updateChatMutation } = useMutation({
		mutationFn: useConvexMutation(api.chats.mutations.update),
	});
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const streamStatus = useAtomValue(streamStatusAtom);
	const { mutate: cancelStreamMutation } = useMutation({
		mutationFn: useConvexMutation(api.streams.mutations.cancel),
	});
	const setNewChat = useSetAtom(newChatAtom);
	const chat = useAtomValue(chatAtom);
	const selectedModel = chat?.model;
	const reasoningEffort = chat?.reasoningEffort;
	const selectedModelConfig = models.find(
		(m) => m.model_name === selectedModel,
	);
	const showReasoningEffort = selectedModelConfig?.isThinking ?? false;
	const router = useRouter();
	const isProjectRoute = router.state.location.pathname.startsWith("/project/");
	const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);
	const setSelectedPanelTab = useSetAtom(selectedPanelTabAtom);
	const { handleToggle: handleAgentToggle, getEnabledSettings } =
		useAgentSettings();
	useApiKeys();

	// Get project details if chat has a project
	const { data: project } = useQuery({
		...convexQuery(
			api.projects.queries.get,
			chat?.projectId ? { projectId: chat.projectId } : "skip",
		),
	});

	const handleFileUpload = useUploadDocuments({ type: "file", chat });
	const handleSubmit = useHandleSubmit();

	// Handle removing project from chat
	const handleRemoveProject = () => {
		if (chatId === "new") {
			setNewChat((prev) => ({
				...prev,
				projectId: null,
			}));
		} else {
			updateChatMutation({
				chatId,
				updates: {
					projectId: null,
				},
			});
		}
	};

	// selected toggles handled in AgentToggles

	return (
		<div className="flex flex-row justify-between items-center w-full p-1">
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				multiple
				onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
			/>
			<GitHubDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				chat={chat!}
			/>

			<div className="flex flex-row items-center gap-1">
				<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="border-none shadow-none"
						>
							<PlusIcon className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="text-foreground/80">
						<DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
							<PaperclipIcon className="w-4 h-4" />
							Attach Documents
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setIsDropdownOpen(false); // unmounting dropdown
								setIsDialogOpen(true); // dialog mount
							}}
						>
							<GithubIcon className="w-4 h-4" />
							Add GitHub Repo
						</DropdownMenuItem>
						{!isProjectRoute && (
							<ProjectsDropdown
								onCloseDropdown={() => setIsDropdownOpen(false)}
							/>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
				<AgentPopover />
				<ToolToggles />

				{/* Agent toggle quick-cancel buttons */}
				{getEnabledSettings().map((setting) => {
					const IconComponent = setting.icon;
					const animationVariant =
						setting.animation === "scale" ? scaleIn : iconSpinVariants;

					return (
						<Button
							key={setting.key}
							variant="outline"
							size="icon"
							className="transition-all duration-300 relative group border-none text-foreground/70 hover:text-foreground cursor-pointer shadow-none"
							onClick={() => handleAgentToggle(setting.key, false)}
							title={setting.tooltip || setting.label}
						>
							<motion.span
								variants={animationVariant}
								initial="initial"
								animate="animate"
								transition={smoothTransition}
								className="group-hover:hidden"
							>
								<IconComponent className="h-4 w-4" />
							</motion.span>
							<span className="absolute inset-0 items-center justify-center hidden group-hover:flex">
								<XIcon className="w-4 h-4 text-destructive" />
							</span>
						</Button>
					);
				})}

				{/* Render project name with X button on hover */}
				{project && (
					<Button
						variant="outline"
						className="group justify-between px-2 border-none"
						onClick={() => {
							setResizePanelOpen(true);
							setSelectedPanelTab("projects");
						}}
					>
						<span className="flex items-center gap-1 cursor-pointer">
							<FoldersIcon className="w-4 h-4 text-foreground/80" />
							<span className="max-w-32 truncate text-foreground/80">
								{project.name}
							</span>
						</span>
						<button
							type="button"
							className="w-4 h-4 text-destructive hidden group-hover:block cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								handleRemoveProject();
							}}
						>
							<XIcon className="w-4 h-4" />
						</button>
					</Button>
				)}
			</div>
			<div className="flex flex-row items-center gap-1">
				{showReasoningEffort && (
					<Select
						value={reasoningEffort}
						onValueChange={(value: "low" | "medium" | "high") => {
							if (chatId === "new") {
								setNewChat((prev) => ({ ...prev, reasoningEffort: value }));
							} else {
								updateChatMutation({
									chatId,
									updates: { reasoningEffort: value },
								});
							}
						}}
					>
						<SelectTrigger className="bg-background border border-none text-foreground/70 hover:text-foreground">
							<BrainIcon className="h-4 w-4" />
							{reasoningEffort}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="low">Low</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="high">High</SelectItem>
						</SelectContent>
					</Select>
				)}
				<ModelPopover
					selectedModel={selectedModel ?? "gemini-2.5-flash"}
					chatId={chatId}
				/>

				<motion.div
					variants={buttonHover}
					initial="rest"
					whileTap="tap"
					transition={smoothTransition}
				>
					{["pending", "streaming"].includes(streamStatus ?? "") ? (
						<StopButtonIcon onClick={() => cancelStreamMutation({ chatId })} />
					) : (
						<Button
							variant="default"
							size="icon"
							disabled={!chat?.text}
							onClick={() => {
								if (!chat?.text) {
									toast.error("Please enter a message before sending");
									return;
								}
								handleSubmit(chat);
							}}
							className={`flex items-center justify-center bg-primary/80 cursor-pointer`}
						>
							<ArrowUp className="h-8 w-8" />
						</Button>
					)}
				</motion.div>
			</div>
		</div>
	);
};
