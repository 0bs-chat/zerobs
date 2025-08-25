import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopy } from "@/hooks/chats/use-copy";

export const CopyButton = ({
	text,
	className,
	duration = 2000,
}: {
	text: string;
	className?: string;
	duration?: number;
}) => {
	const { copy, copied } = useCopy({ duration });

	const handleCopy = () => {
		copy(text);
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleCopy}
						className={` cursor-pointer ${className}`}
					>
						{copied ? (
							<Check className="h-4 w-4" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					{copied ? "Copied!" : "Copy to clipboard"}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};
