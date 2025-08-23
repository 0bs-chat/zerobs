import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { models } from "../../../../../convex/langchain/models";
import { getTagInfo } from "@/lib/helper";
import { Hammer } from "lucide-react";

export function ActionDropdown({
  trigger,
  actionLabel,
  onAction,
  onActionWithModel,
}: {
  trigger: React.ReactNode;
  actionLabel: React.ReactNode;
  onAction: () => void;
  onActionWithModel: (model: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        className=" w-80 h-96 p-1 overflow-y-auto scrollbar-none relative bg-background "
        align="end"
      >
        <DropdownMenuItem className="text-foreground/70" onClick={onAction}>
          {actionLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {models
          .filter((model) => !model.hidden)
          .map((model) => {
            const hammerTagInfo = getTagInfo("toolSupport");
            const thinkingTagInfo = getTagInfo("thinking");
            return (
              <DropdownMenuItem
                key={model.model_name}
                className="justify-between px-2 py-2"
                onClick={() => onActionWithModel(model.model_name)}
              >
                <div className="text-foreground/70 flex gap-2 items-center">
                  <img
                    src={model.image}
                    alt={model.label}
                    className={`h-4 w-4 opacity-70 ${
                      ["openai", "x-ai", "openrouter", "anthropic"].includes(
                        model.owner
                      )
                        ? "dark:invert"
                        : ""
                    } `}
                  />
                  {model.label}
                </div>
                <div className="flex flex-row gap-1 items-center opacity-75">
                  {model.modalities
                    ?.filter((modality) => modality !== "text")
                    .map((modality) => {
                      const {
                        icon: Icon,
                        className: IconClassName,
                        parentClassName,
                      } = getTagInfo(modality);
                      return (
                        <div
                          key={modality}
                          className={`p-1 rounded-md ${parentClassName}`}
                        >
                          <Icon className={`h-4 w-4 ${IconClassName}`} />
                        </div>
                      );
                    })}
                  {model.toolSupport && (
                    <div
                      className={`p-1 rounded-md ${hammerTagInfo.parentClassName}`}
                    >
                      <Hammer
                        className={`h-4 w-4 ${hammerTagInfo.className}`}
                      />
                    </div>
                  )}
                  {model.isThinking && (
                    <div
                      className={`p-1 rounded-md ${thinkingTagInfo.parentClassName}`}
                    >
                      <thinkingTagInfo.icon
                        className={`h-4 w-4 ${thinkingTagInfo.className}`}
                      />
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
