import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Github } from "lucide-react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/settings/feedback")({
	component: RouteComponent,
});

const DiscordInviteURL = "https://discord.gg/7bhP6cybvx";
const GitHubURL = "https://github.com/0bs-chat/zerobs";
const EmailURL = "mailto:0bsaiapp@gmail.com";

function RouteComponent() {
	const isMobile = useIsMobile();
	return (
		<>
			{isMobile && (
				<div>
					<h2 className="text-2xl font-semibold tracking-tight">Feedback</h2>
					<p className="text-muted-foreground">
						Facing any issues? let us know
					</p>
				</div>
			)}
			<div className="flex flex-col space-y-6">
				<div className="flex-col flex gap-2 ">
					<a
						href={DiscordInviteURL}
						target="_blank"
						rel="noopener noreferrer"
						className="group block bg-card rounded-lg hover:bg-accent text-foreground/70 hover:text-foreground transition-colors duration-200 dark:hover:bg-accent/50"
					>
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex items-center gap-3">
								<DiscordLogoIcon className="size-5" />
								<div className="flex flex-col">
									<span className="font-medium">
										Join the Discord Community
									</span>
									<span className="text-xs text-muted-foreground">
										Ask questions, share ideas, or just hang out with us.
									</span>
								</div>
							</div>
							<ArrowUpRight className="size-5 text-muted-foreground group-hover:text-foreground" />
						</div>
					</a>

					<a
						href={EmailURL}
						className="group block bg-card rounded-lg hover:bg-accent text-foreground/70 hover:text-foreground transition-colors duration-200 dark:hover:bg-accent/50"
					>
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex items-center gap-3">
								<Mail className="size-5" />
								<div className="flex flex-col">
									<span className="font-medium">Email us</span>
								</div>
							</div>
							<ArrowUpRight className="size-5 text-muted-foreground group-hover:text-foreground" />
						</div>
					</a>

					<a
						href={GitHubURL}
						target="_blank"
						rel="noopener noreferrer"
						className="group block bg-card rounded-lg hover:bg-accent text-foreground/70 hover:text-foreground transition-colors duration-200 dark:hover:bg-accent/50"
					>
						<div className="flex items-center justify-between rounded-lg border p-4  ">
							<div className="flex items-center gap-3">
								<Github className="size-5" />
								<div className="flex flex-col">
									<span className="font-medium">GitHub</span>
									<span className="text-xs text-muted-foreground">
										Report bugs, request features, or contribute to the project
									</span>
								</div>
							</div>
							<ArrowUpRight className="size-5 text-muted-foreground group-hover:text-foreground" />
						</div>
					</a>
				</div>
			</div>
		</>
	);
}
