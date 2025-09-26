import { createFileRoute } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/settings/profile")({
	component: RouteComponent,
	preloadStaleTime: 30 * 60 * 1000, // 30 minutes
	staleTime: 30 * 60 * 1000, // 30 minutes
});

function RouteComponent() {
	const { data: user } = useQuery(convexQuery(api.auth.getUser, {}));
	const isMobile = useIsMobile();
	const { signOut } = useAuthActions();
	const navigate = useNavigate();

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
				<p className="text-muted-foreground">
					View and manage your account information
				</p>
			</div>

			<Card className="w-full">
				<CardContent className="px-4">
					<div className="flex items-center justify-between gap-4">
						{/* Avatar on the left */}
						<div className="flex items-center justify-center gap-4">
							<Avatar className="h-16 w-16  rounded-xl">
								<AvatarImage src={user?.image ?? ""} alt="Profile" />
								<AvatarFallback className="text-lg">
									{user?.name?.[0]}
								</AvatarFallback>
							</Avatar>

							{/* User info in the center */}
							<div className="flex flex-col gap-1">
								<h3 className="text-xl font-semibold">{user?.name}</h3>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Mail className="h-4 w-4" />
									<span className={isMobile ? "max-w-[14ch] truncate" : ""}>
										{user?.email}
									</span>
								</div>
							</div>
						</div>

						{/* Sign out button on the right */}
						<Button
							onClick={() => {
								signOut();
								navigate({ to: "/auth" });
								toast.success("Signed out");
							}}
							variant="destructive"
							className="cursor-pointer"
						>
							<LogOutIcon />
							<span>Sign out</span>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
