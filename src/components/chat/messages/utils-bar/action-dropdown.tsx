import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { models } from "../../../../../convex/langchain/models";
import { getTagInfo, hammerTagInfo, thinkingTagInfo } from "@/lib/document-helper";
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
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuItem onClick={onAction}>{actionLabel}</DropdownMenuItem>
        <DropdownMenuSeparator />
        {models
          .filter((model) => !model.hidden)
          .map((model) => (
            <DropdownMenuItem
              key={model.model}
              className="justify-between"
              onClick={() => onActionWithModel(model.model_name)}
            >
              <div className="text-foreground flex gap-2 items-center">
                <img src={model.image} alt={model.label} className="h-4 w-4" />
                {model.label}
              </div>
              <div className="flex flex-row gap-1 items-center opacity-75">
                {model.modalities
                  ?.filter((modality) => modality !== "text")
                  .map((modality) => {
                    const allowedTypes = ["file", "url", "site", "youtube", "text", "github"] as const;
                    const type = (allowedTypes.includes(modality as any) ? modality : "file") as typeof allowedTypes[number];
                    const fakeDoc = {
                      _id: "modality" as any,
                      _creationTime: 0,
                      userId: "modality",
                      key: "modality",
                      type,
                      name: modality,
                      size: 0,
                      status: "done" as const,
                    };
                    const {
                      icon: Icon,
                      className: IconClassName,
                      parentClassName,
                    } = getTagInfo(fakeDoc);
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
                    <Hammer className={`h-4 w-4 ${hammerTagInfo.className}`} />
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
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}