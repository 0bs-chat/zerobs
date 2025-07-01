import { ThemeProvider } from "@/components/theme-provider";
import { createFileRoute } from "@tanstack/react-router";
import { SignInButton } from "@clerk/clerk-react";

export const Route = createFileRoute("/landing/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ThemeProvider>
      <main className="flex min-h-screen items-center justify-center font-mono">
        <div className="flex flex-col text-center gap-2">
          <div
            className="flex items-center justify-between w-full"
            style={{ pointerEvents: "auto" }}
          >
            <img
              src="/android-chrome-512x512.png"
              alt="zerobs logo"
              className="cursor-pointer w-12 h-12"
            />
          </div>
          <div className="w-auto text-foreground text-xl">
            the ai chat app for power users.
            <div className="font-semibold flex pt-2 w-full text-foreground text-lg justify-between">
              <a
                href="https://github.com/0bs-chat"
                target="_blank"
                className="hover:cursor-pointer hover:underline transition duration-500 underline-offset-4"
              >
                github
              </a>
              <SignInButton mode="modal">
                <button className="hover:cursor-pointer dark:text-black 
                text-black hover:text-white dark:bg-white 
                px-2 transition duration-500 font-medium">
                  try now
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
}
