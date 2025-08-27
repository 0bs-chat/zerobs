import { memo, useCallback, useRef, useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { BranchNavigation } from "./branch-navigation";
import { Button } from "@/components/ui/button";
import {
	Check,
	CheckCheck,
	GitBranch,
	Pencil,
	RefreshCcw,
	X,
	PaperclipIcon,
} from "lucide-react";
import { ActionDropdown } from "./action-dropdown";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { MessageWithBranchInfo } from "@/hooks/chats/use-messages";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { CopyButton } from "./copy-button";
import { useMessageActions } from "./index";
import { useUploadDocuments } from "@/hooks/chats/use-documents";
import { toast } from "sonner";

interface MessageContent {
	type: string;
	text?: string;
	file?: {
		file_id: Id<"documents">;
	};
}

interface UserUtilsBarProps {
	input: MessageWithBranchInfo;
	isEditing?: boolean;
	setEditing?: Dispatch<SetStateAction<string | null>>;
	editedText?: string;
	editedDocuments?: Id<"documents">[];
	onDone?: () => void;
	onDocumentsChange?: (documents: Id<"documents">[]) => void;
}

export const UserUtilsBar = memo(
	({
		input,
		isEditing,
		setEditing,
		editedText,
		editedDocuments,
		onDone,
		onDocumentsChange,
	}: UserUtilsBarProps) => {
		const { handleBranch, handleRegenerate, navigateBranch } =
			useMessageActions();
		const updateMessage = useMutation(api.chatMessages.mutations.updateInput);
		const chat = useAction(api.langchain.index.chat);
		const fileInputRef = useRef<HTMLInputElement>(null);
		const [isDragActive, setIsDragActive] = useState(false);
		const handleFileUpload = useUploadDocuments({ type: "file" });

		// File upload handlers for editing
		const handleFileInputChange = useCallback(
			async (e: React.ChangeEvent<HTMLInputElement>) => {
				if (e.target.files && e.target.files.length > 0) {
					const uploadedIds = await handleFileUpload(e.target.files);
					if (uploadedIds && onDocumentsChange) {
						onDocumentsChange([...(editedDocuments || []), ...uploadedIds]);
					}
				}
			},
			[handleFileUpload, editedDocuments, onDocumentsChange],
		);

		const handleDrop = useCallback(
			async (e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				setIsDragActive(false);
				if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
					const uploadedIds = await handleFileUpload(e.dataTransfer.files);
					if (uploadedIds && onDocumentsChange) {
						onDocumentsChange([...(editedDocuments || []), ...uploadedIds]);
					}
				}
			},
			[handleFileUpload, editedDocuments, onDocumentsChange],
		);

		const handleDragOver = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				if (!isDragActive) setIsDragActive(true);
			},
			[isDragActive],
		);

		const handleDragLeave = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				if (e.currentTarget.contains(e.relatedTarget as Node)) return;
				setIsDragActive(false);
			},
			[],
		);

		const copyText = (() => {
			const content = input?.message.message.content;
			if (!content) return "";

			if (Array.isArray(content)) {
				const textContent = (content as MessageContent[]).find(
					(entry) => entry.type === "text",
				);
				return textContent?.text || "";
			}
			return typeof content === "string" ? content : "";
		})();

		const handleSubmit = (applySame: boolean, model?: string) => {
			if (!editedText?.trim()) {
				toast.error("Please enter a message");
				return;
			}

			if (!applySame) {
				navigateBranch?.(
					input.depth,
					input.totalBranches,
					input.totalBranches + 1,
				);
			}

			const finalDocuments =
				editedDocuments ??
				(Array.isArray(input.message.message.content)
					? input.message.message.content
							.filter(
								(
									c,
								): c is MessageContent & {
									type: "file";
									file: { file_id: Id<"documents"> };
								} => c.type === "file" && c.file?.file_id !== undefined,
							)
							.map((c) => c.file.file_id)
					: []);

			try {
				updateMessage({
					id: input.message._id as Id<"chatMessages">,
					updates: { text: editedText, documents: finalDocuments },
					applySame: applySame,
				}).then(() => {
					if (applySame === false) {
						chat({ chatId: input.message.chatId, model });
					}
				});
				onDone?.();
			} catch {
				toast.error("Failed to submit message edit");
			}
		};

		const handleKeyDown = useCallback(
			(e: KeyboardEvent) => {
				if (!isEditing) return;

				if (e.key === "Enter" && !e.shiftKey) {
					// Enter: Submit and regenerate
					e.preventDefault();
					handleSubmit(false);
				}
			},
			[isEditing, handleSubmit],
		);

		useEffect(() => {
			if (isEditing) {
				document.addEventListener("keydown", handleKeyDown);
				return () => {
					document.removeEventListener("keydown", handleKeyDown);
				};
			}
		}, [isEditing, handleKeyDown]);

		if (isEditing) {
			return (
				<div
					className="flex flex-row items-center gap-1 self-start "
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
				>
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						multiple
						onChange={handleFileInputChange}
					/>
					<TooltipButton
						onClick={() => setEditing?.(null)}
						icon={<X className="h-4 w-4 text-foreground/70 " />}
						tooltip="Cancel"
					/>
					<TooltipButton
						onClick={() => handleSubmit(true)}
						icon={<Check className="h-4 w-4 text-foreground/70 " />}
						tooltip="Submit"
						ariaLabel="Submit"
						disabled={!editedText?.trim() && editedDocuments?.length === 0}
					/>
					<TooltipButton
						onClick={() => handleSubmit(false)}
						icon={<CheckCheck className="h-4 w-4 text-foreground/70" />}
						tooltip="Submit and Regenerate"
						ariaLabel="Submit and Regenerate"
						disabled={!editedText?.trim() && editedDocuments?.length === 0}
					/>
					<ActionDropdown
						trigger={
							<Button variant="ghost" size="icon" className="cursor-pointer">
								<GitBranch className="h-4 w-4 text-foreground/70 " />
							</Button>
						}
						actionLabel={
							<>
								<GitBranch className="h-4 w-4 mr-2" />
								Branch from edited
							</>
						}
						onAction={() =>
							handleBranch(input, undefined, {
								text: editedText,
								documents: editedDocuments,
							})
						}
						onActionWithModel={(model) =>
							handleBranch(input, model, {
								text: editedText,
								documents: editedDocuments,
							})
						}
					/>
					<TooltipButton
						onClick={() => fileInputRef.current?.click()}
						icon={<PaperclipIcon className="h-4 w-4 text-foreground/70" />}
						tooltip="Attach files"
					/>
				</div>
			);
		}

		return (
			<div className={`flex flex-row items-center gap-1 self-start opacity-70`}>
				<BranchNavigation item={input} navigateBranch={navigateBranch} />
				{setEditing && (
					<TooltipButton
						onClick={() => setEditing(input.message._id)}
						icon={<Pencil className="h-4 w-4" />}
						tooltip="Edit"
						ariaLabel="Edit"
					/>
				)}
				<ActionDropdown
					trigger={
						<Button variant="ghost" size="icon" className="cursor-pointer">
							<GitBranch className="h-4 w-4" />
						</Button>
					}
					actionLabel={
						<>
							<GitBranch className="h-4 w-4 mr-2 cursor-pointer" />
							Branch
						</>
					}
					onAction={() => handleBranch(input)}
					onActionWithModel={(model) => handleBranch(input, model)}
				/>
				<ActionDropdown
					trigger={
						<Button variant="ghost" size="icon" className="cursor-pointer">
							<RefreshCcw className="h-4 w-4" />
						</Button>
					}
					actionLabel={
						<>
							<RefreshCcw className="h-4 w-4 mr-2 cursor-pointer" />
							Regenerate
						</>
					}
					onAction={() => handleRegenerate(input)}
					onActionWithModel={(model) => handleRegenerate(input, model)}
				/>
				{copyText && <CopyButton className="cursor-pointer" text={copyText} />}
			</div>
		);
	},
);

UserUtilsBar.displayName = "UserUtilsBar";
