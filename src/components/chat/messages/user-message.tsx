import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { Markdown } from "@/components/ui/markdown";
import type {
	MessageWithBranchInfo,
	MessageGroup,
} from "../../../../convex/chatMessages/helpers";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDocTagInfo } from "@/lib/helper";
import { models } from "../../../../convex/langchain/models";
import { UserUtilsBar } from "./utils-bar/user-utils-bar";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";

// Shared DocumentList component for both editing and non-editing modes
const DocumentList = ({
	documentIds,
	onRemove,
	onPreview,
	showRemove = false,
}: {
	documentIds: Id<"documents">[];
	onRemove?: (documentId: Id<"documents">) => void;
	onPreview?: (documentId: Id<"documents">) => void;
	showRemove?: boolean;
}) => {
	const {
		data: documents,
		isLoading,
		isError,
	} = useQuery({
		...convexQuery(api.documents.queries.getMultiple, { documentIds }),
	});

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 px-1 pt-1">
				<LoadingSpinner sizeClassName="h-3 w-3" />
				<span className="text-xs text-muted-foreground">
					Loading documents...
				</span>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="px-1 pt-1">
				<ErrorState
					density="compact"
					title="Failed to load documents"
					className="h-6"
				/>
			</div>
		);
	}

	if (!documents?.length) return null;

	const selectedModel = models.find((m) => m.model_name === "gpt-4");
	const modalities = selectedModel?.modalities;

	return (
		<ScrollArea className="max-h-24 w-full px-1 pt-1 whitespace-nowrap">
			<div className="flex gap-1">
				{documents.map((doc) => {
					const { icon: Icon, className: IconClassName } = getDocTagInfo(
						doc,
						modalities,
					);

					return (
						<Badge
							key={doc._id}
							variant="default"
							className="group/badge flex gap-1.5 py-1.5 cursor-pointer bg-accent/65 hover:bg-accent/100 hover:text-accent-foreground text-accent-foreground/90 transition duration-300 items-center justify-center"
							onClick={() => onPreview?.(doc._id)}
						>
							<div className="relative h-4 w-4">
								<Icon
									className={`${IconClassName} h-4 w-4 ${showRemove ? "group-hover/badge:opacity-0" : ""} transition duration-300 opacity-80`}
								/>
								{showRemove && onRemove && (
									<Button
										variant="ghost"
										size="icon"
										className="absolute inset-0 h-4 w-4 opacity-0 group-hover/badge:opacity-100 hover:bg-muted-foreground/20 cursor-pointer transition duration-300"
										onClick={(e) => {
											e.stopPropagation();
											onRemove(doc._id);
										}}
									>
										<XIcon className="w-3 h-3" />
									</Button>
								)}
							</div>
							<span className="max-w-32 group-hover/badge:text-foreground transition duration-200 text-foreground/70 truncate text-xs cursor-pointer">
								{doc.name}
							</span>
						</Badge>
					);
				})}
			</div>
		</ScrollArea>
	);
};

export const UserMessage = memo(
	({
		item,
		groupedMessages,
	}: {
		item: MessageWithBranchInfo;
		groupedMessages?: MessageGroup[];
	}) => {
		// State management moved from UserMessageGroup
		const [editingMessageId, setEditingMessageId] = useState<string | null>(
			null,
		);
		const [editedText, setEditedText] = useState("");
		const [editedDocuments, setEditedDocuments] = useState<Id<"documents">[]>(
			[],
		);

		const isEditing = editingMessageId === item.message._id;

		useEffect(() => {
			if (editingMessageId) {
				const messageToEdit = groupedMessages?.find(
					(g) => g.input.message._id === editingMessageId,
				);
				if (messageToEdit) {
					const content = messageToEdit.input.message.message.content;
					const textContent = Array.isArray(content)
						? ((
								content.find((c) => c.type === "text") as
									| { type: "text"; text: string }
									| undefined
							)?.text ?? "")
						: "";
					const documentIds = Array.isArray(content)
						? content
								.filter((c) => c.type === "file")
								.map((c) => (c as any).file.file_id as Id<"documents">)
						: [];
					setEditedText(textContent);
					setEditedDocuments(documentIds);
				}
			}
		}, [editingMessageId, groupedMessages]);

		const onDone = () => {
			setEditingMessageId(null);
			setEditedText("");
			setEditedDocuments([]);
		};
		const content = item?.message?.message?.content;
		const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

		const handleRemoveDocument = useCallback((documentId: Id<"documents">) => {
			setEditedDocuments((prev) => prev.filter((id) => id !== documentId));
		}, []);

		const handleDocumentsChange = useCallback(
			(documents: Id<"documents">[]) => {
				setEditedDocuments(documents);
			},
			[],
		);

		const handlePreview = useCallback(
			(documentId: Id<"documents">) => {
				setDocumentDialogOpen(documentId);
			},
			[setDocumentDialogOpen],
		);

		// Extract document IDs from content for non-editing mode
		const nonEditingDocumentIds = useMemo(() => {
			if (Array.isArray(content)) {
				return content
					.filter(
						(c): c is { type: "file"; file: { file_id: string } } =>
							c.type === "file",
					)
					.map((c) => c.file.file_id as Id<"documents">);
			}
			return [];
		}, [content]);

		// Memoize the text content rendering to avoid unnecessary calculations
		const renderedTextContent = useMemo(() => {
			if (Array.isArray(content)) {
				return content.map((entry) => {
					return entry.type === "text" ? (
						<Markdown
							key={entry.type + entry.text}
							content={entry.text}
							id={item.message._id}
							className="prose [&_p]:mt-0"
						/>
					) : null;
				});
			}
			return content;
		}, [content, item.message._id]);

		return (
			<div className="group flex flex-col gap-1 w-full">
				<div
					className={`${isEditing ? "w-[80%]" : "max-w-[80%]"} self-end transition-all duration-300`}
				>
					{isEditing ? (
						<div className="bg-card w-full rounded-md shadow-sm p-2 border-2 border-transparent">
							<AutosizeTextarea
								value={editedText}
								onChange={(e) => setEditedText(e.target.value)}
								minHeight={32}
								maxHeight={120}
								className="bg-transparent resize-none border-none w-full ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground/80 outline-none focus-visible:outline-none text-base"
								autoFocus
								placeholder="Edit your message..."
							/>

							{/* File management section */}
							<div className="flex flex-col gap-2">
								{editedDocuments && editedDocuments.length > 0 && (
									<DocumentList
										documentIds={editedDocuments}
										onRemove={handleRemoveDocument}
										onPreview={handlePreview}
										showRemove={true}
									/>
								)}
							</div>
						</div>
					) : (
						<div className="bg-card rounded-md shadow-sm">
							<ScrollArea className="flex flex-col max-h-96 max-w-full px-4 py-3">
								{renderedTextContent}
							</ScrollArea>
							{nonEditingDocumentIds.length > 0 && (
								<div className="px-3 pb-3">
									<DocumentList
										documentIds={nonEditingDocumentIds}
										onPreview={handlePreview}
										showRemove={false}
									/>
								</div>
							)}
						</div>
					)}
				</div>
				<div className="opacity-0 flex gap-2 group-hover:opacity-100 transition-opacity self-end">
					<UserUtilsBar
						input={item}
						isEditing={isEditing}
						setEditing={setEditingMessageId}
						editedText={editedText}
						editedDocuments={editedDocuments}
						onDone={onDone}
						onDocumentsChange={handleDocumentsChange}
					/>
				</div>
			</div>
		);
	},
);

UserMessage.displayName = "UserMessage";
