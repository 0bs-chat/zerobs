import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CircleStopIcon } from "lucide-react";
import { useState } from "react";

const videoSrc =
	"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS7jPNQyfoRlTOJZLHPU4rbCz2w1X9SVIfEyKF";

export const StopButtonIcon = ({
	className,
	onClick,
}: {
	className?: string;
	onClick: () => void;
}) => {
	const [error, setError] = useState(false);

	if (error) {
		return <CircleStopIcon className={className} />;
	}

	return (
		<Button
			variant="ghost"
			onClick={onClick}
			size="icon"
			className={cn(
				"cursor-pointer h-9 w-9 flex items-center justify-center",
				className,
			)}
		>
			<video
				src={videoSrc}
				aria-label="Stop button animation"
				role="button"
				autoPlay
				loop
				muted
				playsInline
				onError={() => setError(true)}
				className="h-8 w-8 -translate-y-1 -translate-x-0.5"
			/>
		</Button>
	);
};
