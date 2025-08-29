import { memo, useState } from "react";
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown";
import { BrainIcon, ChevronDownIcon, Loader2 } from "lucide-react";

interface ReasoningProps {
	reasoning?: string;
	messageId: string;
	isStreaming?: boolean;
}

export const Reasoning = memo(
	({ reasoning, messageId, isStreaming }: ReasoningProps) => {
		const [isOpen, setIsOpen] = useState(false);
		if (!reasoning) return null;

		return (
			<Accordion
				type="multiple"
				className="w-full"
				defaultValue={["reasoning"]}
				onValueChange={(value) => setIsOpen(value.includes("reasoning"))}
			>
				<AccordionItem
					value="reasoning"
					className={`px-0 ${isOpen ? "border-none" : ""}`}
				>
					<AccordionTrigger
						showIcon={false}
						className="py-1.5 justify-between gap-2 text-xs font-semibold items-center cursor-pointer"
					>
						<div className="flex items-center gap-2">
							<BrainIcon className="text-foreground/70 pointer-events-none size-4 " />
							<div className="text-foreground/70">Reasoning</div>
							{isStreaming && (
								<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
							)}
						</div>
						<ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />
					</AccordionTrigger>
					<AccordionContent className="bg-card rounded-md p-2 mt-2 max-h-[36rem] overflow-y-auto">
						<Markdown
							content={reasoning}
							id={messageId}
							className="prose-p:text-sm prose-p:text-muted-foreground"
						/>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
	},
);

Reasoning.displayName = "Reasoning";
