import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="flex flex-col items-center h-full w-full justify-center p-2 gap-2">
      <div className="text-5xl font-bold"> 👋 hi, how can i help you ?</div>
    </div>
  );
}
