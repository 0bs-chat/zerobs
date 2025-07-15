import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/settings/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useQuery(api.auth.getUser);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 rounded-full cursor-pointer">
          <AvatarImage src={user?.image} alt={user?.name ?? ""} />
          <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <h1 className="text-sm text-muted-foreground">{user?.email}</h1>
        </div>
      </div>
    </div>
  );
}
