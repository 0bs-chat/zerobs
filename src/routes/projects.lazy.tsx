import { createLazyFileRoute, useLocation } from "@tanstack/react-router";
import { ProjectsList } from "@/components/chat/panels/projects/list";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createLazyFileRoute("/projects")({
	component: RouteComponent,
});

function RouteComponent() {
	const isOnProjectsRoute = useLocation().pathname === "/projects";
	const isMobile = useIsMobile();
	return (
		<div
			className={` ${isOnProjectsRoute ? `flex h-[calc(100vh-24rem)] flex-col ${isMobile ? "w-full pt-12" : "max-w-6xl mx-auto"}` : "min-w-4xl py-4 mx-auto"}`}
		>
			<ProjectsList />
		</div>
	);
}
