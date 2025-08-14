import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Mail, Github } from "lucide-react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

export const Route = createFileRoute("/settings/feedback")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex-col flex gap-2 ">
        <a
          href="https://discord.gg/rVFT3PqK"
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="flex items-center justify-between rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
            <div className="flex items-center gap-3">
              <DiscordLogoIcon className="size-5" />
              <div className="flex flex-col">
                <span className="font-medium">Join the Discord Community</span>
                <span className="text-xs text-muted-foreground">
                  Ask questions, share ideas, or just hang out with us.
                </span>
              </div>
            </div>
            <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-foreground" />
          </div>
        </a>

        <a href="mailto:0bsaiapp@gmail.com" className="group block">
          <div className="flex items-center justify-between rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
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
          href="https://github.com/0bs-chat/zerobs"
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="flex items-center justify-between rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
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
  );
}
