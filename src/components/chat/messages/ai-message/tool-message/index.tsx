import { memo, useMemo } from "react";
import { SearchResultDisplay, type SearchResult } from "./search-results";
import { DocumentResultDisplay, type DocumentResult } from "./document-results";
import type { BaseMessage } from "@langchain/core/messages";
import { FileDisplay } from "./file-result";
import ToolAccordion from "@/components/ui/tool-accoordion";
import { StreamingOutput } from "@/components/ui/streaming-output";

export const ToolMessage = memo(({ message }: { message: BaseMessage }) => {
	const parsedContent = useMemo(() => {
		if (!message) return null;

		if (message.name === "searchWeb") {
			try {
				return {
					type: "searchWeb" as const,
					results: JSON.parse(message.content as string) as SearchResult[],
				};
			} catch {
				return { type: "generic" as const, content: message.content };
			}
		}

		if (message.name === "searchProjectDocuments") {
			try {
				return {
					type: "document" as const,
					results: JSON.parse(message.content as string) as DocumentResult[],
				};
			} catch {
				return { type: "generic" as const, content: message.content };
			}
		}

		try {
			const maybeArr = JSON.parse(message.content as string);
			if (Array.isArray(maybeArr)) {
				const isMixed = maybeArr.some(
					(i) =>
						(i.type === "file" && i.file?.file_id) ||
						(i.type === "text" && i.text),
				);
				if (isMixed) {
					return { type: "mixed" as const, content: maybeArr };
				}
			}
		} catch {
			// not JSON or not the format we expected
		}

		// 4) fallback generic
		return { type: "generic" as const, content: message.content };
	}, [message]);

	const input = (message.additional_kwargs as any)?.input as
		| Record<string, any>
		| undefined;

	interface MessageAdditionalKwargs {
		input?: Record<string, any>;
		is_complete?: boolean;
	}

	const isComplete = (message.additional_kwargs as MessageAdditionalKwargs)
		?.is_complete;

	if (!parsedContent) return null;

	// Search/Web calls render in their own specialized component
	if (parsedContent.type === "searchWeb") {
		// Show streaming output if not complete
		if (isComplete === false || !parsedContent.results.length) {
			return (
				<ToolAccordion
					messageName={message.name ?? "unknown"}
					input={input}
					isComplete={isComplete}
				>
					<StreamingOutput content="" isComplete={isComplete} />
				</ToolAccordion>
			);
		}

		return (
			<SearchResultDisplay results={parsedContent.results} input={input} />
		);
	}

	if (parsedContent.type === "document") {
		return <DocumentResultDisplay results={parsedContent.results} />;
	}

	// MIXED: files + text blocks
	if (parsedContent.type === "mixed") {
		return (
			<ToolAccordion
				messageName={message.name ?? "unknown"}
				input={input}
				isComplete={isComplete}
			>
				<div className="flex flex-col gap-4">
					{parsedContent.content.map((item) => {
						if (item.type === "file" && item.file?.file_id) {
							return (
								<FileDisplay
									key={item.file.file_id}
									fileId={item.file.file_id}
								/>
							);
						}
						if (item.type === "text" && item.text) {
							return (
								<StreamingOutput
									key={item.text}
									content={item.text}
									isComplete={isComplete}
								/>
							);
						}
						return null;
					})}
				</div>
			</ToolAccordion>
		);
	}

	// GENERIC: just dump the string or JSON
	return (
		<ToolAccordion
			messageName={message.name ?? "unknown"}
			input={input}
			isComplete={isComplete}
		>
			<StreamingOutput
				content={
					typeof parsedContent.content === "string"
						? parsedContent.content
						: JSON.stringify(parsedContent.content, null, 2)
				}
				isComplete={isComplete}
			/>
		</ToolAccordion>
	);
});
ToolMessage.displayName = "ToolMessage";
