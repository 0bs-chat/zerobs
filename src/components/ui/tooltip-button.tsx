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
				{disabled ? (
					<span className="inline-flex" aria-disabled="true">
						<Button
							variant="ghost"
							size="icon"
							type="button"
							aria-label={ariaLabel ?? tooltip}
							disabled
							onClick={undefined}
							className="cursor-not-allowed"
						>
							{icon}
						</Button>
					</span>
				) : (
					<Button
						variant="ghost"
						size="icon"
						type="button"
						onClick={onClick}
						aria-label={ariaLabel ?? tooltip}
					>
						{icon}
					</Button>
				)}
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	</TooltipProvider>
);
