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

interface IntegrationCardProps {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
}

function IntegrationCard({ icon, title, description, buttonText }: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg gap-4 flex items-center">
          <div className="flex items-center gap-2">
            <img src={icon} alt={title} className="w-4 h-4" />
            {title}
          </div>
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled>{buttonText}</Button>
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  const integrations = [
    {
      icon: "/google.svg",
      title: "Connect with Google",
      description: "Connect with google to get access to your calendar, email in the chat.",
      buttonText: "Connect with Google"
    },
    {
      icon: "https://www.convex.dev/favicon.ico",
      title: "Connect to Convex",
      description: "Connect to Convex for real-time database and backend services.",
      buttonText: "Connect to Convex"
    },
    {
      icon: "https://github.com/favicon.ico",
      title: "Connect with GitHub",
      description: "Connect with GitHub to access your repositories and manage code.",
      buttonText: "Connect with GitHub"
    },
    {
      icon: "https://twitter.com/favicon.ico",
      title: "Connect with Twitter",
      description: "Connect with Twitter to access your tweets and social media content.",
      buttonText: "Connect with Twitter"
    },
    {
      icon: "https://www.google.com/s2/favicons?sz=32&domain_url=https%3A%2F%2Fwww.notion.so%2F",
      title: "Connect with Notion",
      description: "Connect with Notion to access your notes, documents, and workspace.",
      buttonText: "Connect with Notion"
    }
  ];

  return (
    <div className="flex flex-col gap-2">
      {integrations.map((integration, index) => (
        <IntegrationCard
          key={index}
          icon={integration.icon}
          title={integration.title}
          description={integration.description}
          buttonText={integration.buttonText}
        />
      ))}
    </div>
  );
}
