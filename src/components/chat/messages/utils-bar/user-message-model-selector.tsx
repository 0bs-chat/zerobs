import { getModalityIcon } from "@/lib/helpers";
import { models } from "../../../../../convex/langchain/models";
import { Hammer, RefreshCcwDot, SearchIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { userMessageModelPopoverOpenAtom } from "@/store/chatStore";
import { useAtom } from "jotai";
import type {
  MessageWithBranchInfo,
  NavigateBranch,
} from "@/hooks/chats/use-messages";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const UserMessageModelSelector = ({
  item,
  children,
  navigateBranch,
}: {
  item: MessageWithBranchInfo;
  children: ReactNode;
  navigateBranch: NavigateBranch;
}) => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const [popoveropen, setPopoverOpen] = useAtom(
    userMessageModelPopoverOpenAtom
  );
  const [searchModel, setSearchModel] = useState("");

  const regenerate = useAction(api.langchain.index.regenerate);
  const updateChatMutation = useMutation(api.chats.mutations.update);

  return (
    <Popover open={popoveropen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        asChild
        onClick={() => setPopoverOpen(!popoveropen)}
        className="gap-2 cursor-pointer bg-background items-center justify-center"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-y-auto p-0" align="end">
        <SearchInput
          searchModel={searchModel}
          setSearchModel={setSearchModel}
        />
        <div className="space-y-1 p-1 dark:bg-black/35 bg-white">
          <div
            className="flex items-center gap-2 px-3 py-3 cursor-pointer rounded-sm  hover:bg-accent/25 dark:hover:bg-accent/60 "
            onClick={() => {
              navigateBranch?.(item.depth, item.totalBranches);
              regenerate({
                messageId: item.message._id,
              });
            }}
          >
            <RefreshCcwDot className="h-4 w-4 text-accent-foreground" />
            Retry Same
          </div>
          {models
            .filter((model) => !model.hidden)
            .filter((model) =>
              model.model_name.toLowerCase().includes(searchModel.toLowerCase())
            )
            .map((model) => (
              <div
                key={model.model}
                className={`flex items-center gap-2 px-3 py-3 cursor-pointer rounded-sm transition-colors justify-between hover:bg-accent/25 dark:hover:bg-accent/60 `}
                onClick={async () => {
                  await updateChatMutation({
                    chatId,
                    updates: { model: model.model_name },
                  });
                  navigateBranch?.(item.depth, item.totalBranches);
                  regenerate({
                    messageId: item.message._id,
                  });
                }}
              >
                <div className="text-foreground flex gap-2 items-center justify-center ">
                  <img
                    src={model.image}
                    alt={model.label}
                    className={`h-4 w-4 ${
                      ["openai", "x-ai", "openrouter"].includes(model.ownedby)
                        ? "dark:invert"
                        : ""
                    }`}
                  />
                  {model.label}
                </div>
                <div className="flex flex-row gap-2 items-center opacity-75">
                  {model.modalities?.map((modality) => {
                    const { icon: Icon, className: IconClassName } =
                      getModalityIcon(modality);
                    return (
                      <Icon
                        key={modality}
                        className={`h-4 w-4 ${IconClassName}`}
                      />
                    );
                  })}
                  {model.toolSupport && (
                    <Hammer key={model.model} className="h-4 w-4" />
                  )}
                </div>
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const SearchInput = ({
  searchModel,
  setSearchModel,
}: {
  searchModel: string;
  setSearchModel: (searchModel: string) => void;
}) => {
  return (
    <div className="flex items-center border-b border-border px-4 bg-black/60 py-1 gap-2">
      <span className="flex items-center justify-center">
        <SearchIcon className="w-4 h-4 text-muted-foreground" />
      </span>
      <Input
        placeholder="Search models"
        className="flex-1 bg-transparent border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none text-base px-0"
        type="text"
        value={searchModel}
        onChange={(e) => setSearchModel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSearchModel("");
            e.currentTarget.blur();
          }
        }}
        style={{ backgroundColor: "transparent" }}
      />
      {searchModel !== "" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchModel("")}
          className="flex items-center justify-center size-5"
          tabIndex={-1}
        >
          <XIcon className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
