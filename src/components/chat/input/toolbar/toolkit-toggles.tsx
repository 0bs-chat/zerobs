import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hammer, PlusIcon } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, chatIdAtom, newChatAtom } from "@/store/chatStore";
import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { providers } from "../../../../../convex/utils/oauth/providers";
import { apiKeysAtom } from "@/hooks/use-apikeys";
import { useNavigate } from "@tanstack/react-router";

type ProviderKey = keyof typeof providers;

export function ToolkitToggles() {
  const chatId = useAtomValue(chatIdAtom);
  const chat = useAtomValue(chatAtom)!;
  const setNewChat = useSetAtom(newChatAtom);
  const existingKeys = useAtomValue(apiKeysAtom);
  const existingKeySet = useMemo(() => new Set((existingKeys ?? []).map((k) => k.key)), [existingKeys]);
  const navigate = useNavigate();

  const connectedProviders = useMemo<ProviderKey[]>(() => {
    const result: ProviderKey[] = [];
    (Object.entries(providers) as Array<[ProviderKey, (typeof providers)[ProviderKey]]>).forEach(
      ([p, cfg]) => {
        const access = cfg.accessKeyKey;
        const refresh = cfg.refreshKeyKey;
        if (existingKeySet.has(access) || existingKeySet.has(refresh)) result.push(p);
      },
    );
    return result;
  }, [existingKeySet]);

  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });

  const isEnabled = (p: ProviderKey) => (chat.enabledToolkits || []).includes(p as string);

  const toggleProvider = (p: ProviderKey, enable: boolean) => {
    const next = new Set<string>(chat.enabledToolkits || []);
    if (enable) next.add(p as string); else next.delete(p as string);

    if (chatId === "new") {
      setNewChat((prev) => ({ ...prev, enabledToolkits: Array.from(next) as string[] }));
    } else {
      updateChatMutation({ chatId, updates: { enabledToolkits: Array.from(next) } });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Toolkits" className="cursor-pointer">
            <Hammer className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">Toolkits</div>
          {connectedProviders.map((p) => (
            <DropdownMenuItem
              key={p}
              onClick={() => toggleProvider(p, !isEnabled(p))}
              className="flex items-center justify-between pr-2 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <img src={providers[p].icon} alt={providers[p].title} className="h-4 w-4" />
                {providers[p].title}
              </span>
              <span className="ml-auto flex items-center">
                {isEnabled(p) && (
                  <svg className="size-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => navigate({ to: "/settings/integrations" })} className="bg-accent/50">
            <PlusIcon className="w-4 h-4" />
            Add Integrations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {(chat.enabledToolkits || [])
        .filter((p) => connectedProviders.includes(p as ProviderKey))
        .map((p) => (
        <Button
          key={p}
          variant="outline"
          size="icon"
          title={providers[p as ProviderKey].title}
          onClick={() => toggleProvider(p as ProviderKey, false)}
        >
          <img src={providers[p as ProviderKey].icon} alt={providers[p as ProviderKey].title} className="h-4 w-4" />
        </Button>
      ))}
    </>
  );
}
