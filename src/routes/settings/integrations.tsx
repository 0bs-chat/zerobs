import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/settings/integrations")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg gap-4 flex items-center">
            <div className="flex items-center gap-2">
              <img src="/google.svg" alt="Google" className="w-4 h-4" />
              Connect with Google
            </div>
          </CardTitle>
          <CardDescription>
            Connect with google to get access to your calendar, email in the
            chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Connect with Google</Button>
        </CardContent>
      </Card>
    </div>
  );
}
