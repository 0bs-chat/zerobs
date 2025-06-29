import { createFileRoute } from "@tanstack/react-router";
import { SignInButton } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center font-mono">
      <div className="flex flex-col text-center gap-2">
        <a
          href="https://github.com/0bs-chat"
          className="flex items-center justify-between w-full"
          style={{ pointerEvents: "auto" }}
        >
          <img
            src="https://ypazyw0thq.ufs.sh/f/38t7p527clgqcnGaavggLnpFWuQyrejwqNAbak791G6l3HdE"
            height={48}
            width={48}
            alt="zerobs logo"
            loading="eager"
            className="cursor-pointer"
          />
        </a>
        <div className="w-auto text-foreground text-xl">
          the ai chat app for power users.
          <div className="font-semibold flex pt-2 w-full text-foreground text-lg justify-between">
            <SignInButton>
              <div className=" hover:cursor-pointer bg-accent hover:bg-accent-foreground text-accent-foreground hover:text-accent transition-all duration-300 px-4 py-2 w-full">
                Sign in
              </div>
            </SignInButton>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;
