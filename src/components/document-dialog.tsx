import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { api } from "../../convex/_generated/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { Button } from "@/components/ui/button";
import { getDocTagInfo } from "@/lib/helper";
import { formatBytes } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";

const isSafeHttpUrl = (raw: string): boolean => {
	try {
		const url = new URL(raw);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

export const DocumentDialog = () => {
	const documentDialogOpen = useAtomValue(documentDialogOpenAtom);
	const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const { data: document } = useQuery({
		...convexQuery(
			api.documents.queries.get,
			documentDialogOpen ? { documentId: documentDialogOpen } : "skip",
		),
		enabled: !!documentDialogOpen,
	});

	const { mutateAsync: generateDownloadUrl } = useMutation({
		mutationFn: useConvexMutation(api.documents.mutations.generateDownloadUrl),
	});

	const documentName = document?.name ?? "";
	const {
		icon: Icon,
		className: IconClassName,
		tag,
	} = document
		? getDocTagInfo(document)
		: { icon: () => null, className: "", tag: "" };

	useEffect(() => {
		setPreviewUrl(null);
		setPreviewError(null);

		const loadPreviewUrl = async () => {
			if (!document) return;
			try {
				switch (tag) {
					case "image":
					case "pdf":
					case "file": {
						// Only files need download URL
						const url = await generateDownloadUrl({
							documentId: document._id,
						});
						setPreviewUrl(url);
						break;
					}
					case "url":
					case "site": {
						setPreviewUrl(document.key as string);
						break;
					}
					case "youtube": {
						setPreviewUrl(`https://www.youtube.com/embed/${document.key}`);
						break;
					}
					default:
						if (["file", "text", "github"].includes(document.type)) {
							const url = await generateDownloadUrl({
								documentId: document._id,
							});
							setPreviewUrl(url);
							break;
						} else {
							setPreviewUrl(document.key as string);
						}
						break;
				}
			} catch (error) {
				setPreviewError(
					`Failed to load preview: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		};
		loadPreviewUrl();
	}, [document, tag, generateDownloadUrl]);

	// Early return if dialog is not open
	if (!documentDialogOpen) {
		return null;
	}

	const handleDownload = async () => {
		if (!document || !["file", "image", "pdf", "audio", "video"].includes(tag))
			return;
		try {
			const url = await generateDownloadUrl({
				documentId: document._id,
			});
			if (url) {
				const w = window.open(url, "_blank", "noopener,noreferrer");
				if (w) w.opener = null;
			}
		} catch (err) {
			setPreviewError(
				`Failed to download: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	};

	const handleOpen = () => {
		if (!document) return;
		if (tag === "url" || tag === "site") {
			if (!isSafeHttpUrl(document.key as string)) {
				return;
			}
			const w = window.open(
				document.key as string,
				"_blank",
				"noopener,noreferrer",
			);
			if (w) w.opener = null;
		} else if (tag === "youtube") {
			const w = window.open(
				`https://youtube.com/watch?v=${document.key}`,
				"_blank",
				"noopener,noreferrer",
			);
			if (w) w.opener = null;
		}
	};

	return (
		<Dialog
			open={!!documentDialogOpen}
			onOpenChange={() => setDocumentDialogOpen(undefined)}
		>
			<DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon className={`${IconClassName} h-8 w-8`} />
						<span>{documentName}</span>
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4 flex-grow overflow-hidden">
					<div className="flex flex-col gap-2">
						<div className="text-sm text-muted-foreground">
							Type:{" "}
							{document?.type &&
								document.type.charAt(0).toUpperCase() + document.type.slice(1)}
						</div>
						{document?.size && (
							<div className="text-sm text-muted-foreground">
								Size: {formatBytes(document.size)}
							</div>
						)}
					</div>

					{previewError ? (
						<div className="flex-grow flex items-center justify-center bg-muted rounded-md border">
							<div className="text-center text-muted-foreground">
								{previewError}
							</div>
						</div>
					) : previewUrl ? (
						<div className="flex-grow relative min-h-0 bg-muted rounded-md border overflow-hidden">
							{(() => {
								if (tag === "image") {
									return (
										<img
											src={previewUrl}
											alt={documentName}
											className="absolute inset-0 w-full h-full object-contain"
										/>
									);
								} else if (tag === "pdf") {
									return (
										<object
											data={previewUrl}
											className="absolute inset-0 w-full h-full"
											type="application/pdf"
										>
											<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
												PDF preview not supported in your browser. Please
												download the file to view it.
											</div>
										</object>
									);
								} else if (tag === "youtube") {
									return (
										<iframe
											title={`YouTube video: ${documentName}`}
											src={previewUrl}
											className="absolute inset-0 w-full h-full"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
										/>
									);
								} else if (tag === "url" || tag === "site") {
									return (
										<iframe
											title={`Website preview: ${documentName}`}
											src={previewUrl}
											className="absolute inset-0 w-full h-full"
											sandbox="allow-same-origin allow-scripts"
											style={{
												transform: "scale(0.95)",
												transformOrigin: "top left",
												width: "105.3%", // 100/0.95 to compensate for scale
												height: "105.3%",
											}}
										/>
									);
								} else if (tag === "file") {
									// fallback for unknown file types
									return (
										<object
											data={previewUrl}
											className="absolute inset-0 w-full h-full"
											type="application/octet-stream"
										>
											<div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
												File preview not supported. Please download the file to
												view it.
											</div>
										</object>
									);
								}
								return null;
							})()}
						</div>
					) : null}
				</div>

				<div className="flex justify-end gap-2 mt-4">
					{tag === "file" ? (
						<Button onClick={handleDownload}>Download</Button>
					) : tag === "url" || tag === "site" || tag === "youtube" ? (
						<Button onClick={handleOpen}>
							Open {tag === "youtube" ? "in YouTube" : "in Browser"}
						</Button>
					) : null}
					<Button
						variant="outline"
						onClick={() => setDocumentDialogOpen(undefined)}
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
