import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/switcher";
import { cn } from "@/lib/utils";
import {
	createLazyFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	KeyIcon,
	MessageCircle,
	Plug,
	User,
	Wallet2,
} from "lucide-react";
import { useEffect } from "react";
import { useApiKeys } from "@/hooks/use-apikeys";
import { useIsMobile } from "@/hooks/use-mobile";

const settingsNavItems = [
	{
		title: "Profile",
		href: "/settings/profile",
		icon: User,
	},
	{
		title: "API Keys",
		href: "/settings/apiKeys",
		icon: KeyIcon,
	},
	{
		title: "Integrations",
		href: "/settings/integrations",
		icon: Plug,
	},
	{
		title: "Billing",
		href: "/settings/billing",
		icon: Wallet2,
	},
	{
		title: "Feedback",
		href: "/settings/feedback",
		icon: MessageCircle,
	},
];

export const Route = createLazyFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	useEffect(() => {
		if (
			location.pathname === "/settings" ||
			location.pathname === "/settings/"
		) {
			navigate({
				to: "/settings/profile",
				replace: true,
			});
		}
	}, [location.pathname, navigate]);

	useApiKeys();

	return (
		<div className="flex h-screen flex-col overflow-y-auto  w-full">
			<div
				className={`container mx-auto flex ${isMobile ? "max-w-full" : "max-w-6xl"} flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6`}
			>
				{/* Header */}
				<div className="mb-8 ">
					<div className="mb-6 flex items-center justify-between">
						<Link to="/chat/$chatId" params={{ chatId: "new" }}>
							<Button variant="outline" className=" cursor-pointer">
								<ArrowLeft className="h-6 w-6" />
								Back to chat
							</Button>
						</Link>
						<ThemeSwitcher />
					</div>

					<div className="space-y-1">
						<h1
							className={`font-semibold text-3xl ${isMobile ? "text-2xl" : ""} tracking-tight`}
						>
							Settings
						</h1>
						<p className="text-muted-foreground">
							Manage your account settings, preferences and integrations.
						</p>
					</div>
				</div>

				<div
					className={`${isMobile ? "flex flex-col" : "grid w-full grid-cols-1 gap-8 lg:grid-cols-4 "}`}
				>
					{/* Navigation */}
					<div
						className={` ${isMobile ? "bg-accent w-full rounded-md mb-2" : ""}`}
					>
						<nav className={`w-full ${isMobile ? "flex w-full" : ""}`}>
							{settingsNavItems.map((item) => {
								const isActive = location.pathname === item.href;
								const Icon = item.icon;

								return (
									<Link
										key={item.href}
										to={item.href}
										className={cn(
											` ${isMobile ? "text-xs flex gap-1 items-center justify-center w-full p-3 " : "text-sm flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium"} transition-colors rounded-md`,
											isActive
												? "bg-sidebar-primary/10 text-foreground"
												: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
										)}
									>
										{<Icon className="h-5 w-5" />}
										{!isMobile && item.title}
									</Link>
								);
							})}
						</nav>
					</div>

					{/* Main Content */}
					<div className="col-span-3 flex-1">
						<div
							className={`space-y-6 p-0.5  lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto`}
						>
							<Outlet />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
