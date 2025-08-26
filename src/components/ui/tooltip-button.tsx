import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Helper component to reduce tooltip boilerplate
export const TooltipButton = ({
	onClick,
	icon,
	tooltip,
	disabled,
	ariaLabel,
}: {
	onClick: () => void;
	icon: ReactNode;
	tooltip: string;
	ariaLabel?: string;
	disabled?: boolean;
}) => (
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClick}
					aria-label={ariaLabel}
					className="cursor-pointer"
					disabled={disabled}
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	</TooltipProvider>
);
