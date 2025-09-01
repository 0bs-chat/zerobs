import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Hammer,
  ChevronDownIcon,
  Search,
  Settings,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSetAtom, useAtom } from "jotai";
import { getTagInfo } from "@/lib/helper";
import { api } from "../../../../../convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import {
  newChatAtom,
  modelPreferencesAtom,
  type ModelPreferences,
} from "@/store/chatStore";
import { useModels } from "@/hooks/chats/use-models";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { models } from "../../../../../convex/langchain/models";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Model Item Component
const SortableModelItem = ({
  model,
  preferences,
  onToggleVisibility,
}: {
  model: (typeof models)[number];
  preferences: ModelPreferences;
  onToggleVisibility: (modelName: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.model_name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isHidden = preferences.hidden.includes(model.model_name);
  const toolSupportTag = getTagInfo("toolSupport");
  const thinkingTagInfo = getTagInfo("thinking");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-3 rounded-sm transition-colors justify-between hover:bg-accent/25 dark:hover:bg-accent/60 ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent/25 rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <img
          src={model.image}
          aria-label={`${model.label} model icon`}
          alt={model.label}
          className={`h-4 w-4 opacity-80 ${
            ["openai", "x-ai", "openrouter", "anthropic"].includes(model.owner)
              ? "dark:invert"
              : ""
          }`}
        />

        <span
          className={`text-sm ${isHidden ? "text-muted-foreground line-through" : "text-foreground"}`}
        >
          {model.label}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Model Tags */}
        <div className="flex gap-1 items-center opacity-75">
          {model.modalities
            ?.filter((modality: string) => modality !== "text")
            .map((modality: string) => {
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
                  <Icon className={`h-3 w-3 ${IconClassName}`} />
                </div>
              );
            })}
          {model.toolSupport && (
            <div className={`p-1 rounded-md ${toolSupportTag.parentClassName}`}>
              <Hammer className={`h-3 w-3 ${toolSupportTag.className}`} />
            </div>
          )}
          {model.isThinking && (
            <div
              className={`p-1 rounded-md ${thinkingTagInfo.parentClassName}`}
            >
              <thinkingTagInfo.icon
                className={`h-3 w-3 ${thinkingTagInfo.className}`}
              />
            </div>
          )}
        </div>

        {/* Usage Rate Multiplier */}
        {model.usageRateMultiplier !== 1.0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <span className="font-medium">{model.usageRateMultiplier}x</span>
          </div>
        )}

        {/* Action Buttons */}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => onToggleVisibility(model.model_name)}
        >
          {isHidden ? (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Eye className="h-3 w-3 text-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
};

// Model Management Dialog Component
const ModelManagementDialog = ({
  orderedModels,
  preferences,
  onReorderModels,
  onToggleVisibility,
}: {
  orderedModels: typeof models;
  preferences: ModelPreferences;
  onReorderModels: (newOrder: string[]) => void;
  onToggleVisibility: (modelName: string) => void;
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = orderedModels.findIndex(
        (model) => model.model_name === active.id,
      );
      const newIndex = orderedModels.findIndex(
        (model) => model.model_name === over?.id,
      );

      const newOrder = arrayMove(
        orderedModels.map((m) => m.model_name),
        oldIndex,
        newIndex,
      );

      onReorderModels(newOrder);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Models</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedModels.map((m) => m.model_name)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {orderedModels.map((model) => (
                  <SortableModelItem
                    key={model.model_name}
                    model={model}
                    preferences={preferences}
                    onToggleVisibility={onToggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function ModelPopover({
  selectedModel,
  chatId,
}: {
  selectedModel: string;
  chatId: Id<"chats">;
}) {
  const setNewChat = useSetAtom(newChatAtom);
  const { mutateAsync: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const [preferences, setPreferences] = useAtom(modelPreferencesAtom);
  const { orderedModels, visibleModels } = useModels();

  const selectedModelConfig = visibleModels.find(
    (m) => m.model_name === selectedModel,
  );
  const [searchModel, setSearchModel] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Ref callback for model items
  const setModelRef = useCallback((index: number, el: HTMLDivElement | null) => {
    modelRefs.current[index] = el;
  }, []);
  const toolSupportTag = getTagInfo("toolSupport");
  const thinkingTagInfo = getTagInfo("thinking");

  // Detect platform for keyboard shortcut display
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? "⌥" : "Alt";

  const isNewChat = !chatId || chatId === "new";

  // Local handlers for model management
  const handleReorderModels = useCallback(
    (newOrder: string[]) => {
      setPreferences((prev: ModelPreferences) => ({
        ...prev,
        order: newOrder,
      }));
    },
    [setPreferences],
  );

  const handleToggleVisibility = useCallback(
    (modelName: string) => {
      setPreferences((prev: ModelPreferences) => {
        const isHidden = prev.hidden.includes(modelName);
        if (isHidden) {
          return {
            ...prev,
            hidden: prev.hidden.filter((name: string) => name !== modelName),
          };
        } else {
          return {
            ...prev,
            hidden: [...prev.hidden, modelName],
          };
        }
      });
    },
    [setPreferences],
  );

  const handleModelSelect = async (modelName: string) => {
    if (isNewChat) {
      setNewChat((prev) => ({ ...prev, model: modelName }));
    } else {
      await updateChatMutation({
        chatId,
        updates: { model: modelName },
      });
    }
    setPopoverOpen(false);
    setHighlightedIndex(-1);
  };

  // Get filtered models for shortcuts
  const filteredModels = visibleModels.filter(
    (model) =>
      model.model_name.toLowerCase().includes(searchModel.toLowerCase()) ||
      model.label.toLowerCase().includes(searchModel.toLowerCase()),
  );

  const selectModelByIndex = useCallback(
    async (index: number) => {
      if (index >= filteredModels.length) return;
      await handleModelSelect(filteredModels[index].model_name);
    },
    [filteredModels, handleModelSelect],
  );

  // Consolidated keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+M to toggle popover
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setPopoverOpen(prev => !prev);
        return;
      }

      // Alt+number shortcuts (global)
      if (e.altKey && !e.repeat) {
        const digit = parseInt(e.key, 10);
        if (!isNaN(digit) && digit >= 1) {
          e.preventDefault();
          selectModelByIndex(digit - 1);
        }
        return;
      }

      // Arrow keys, Enter, Escape (only when popover is open)
      if (!popoverOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredModels.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredModels.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredModels.length) {
            handleModelSelect(filteredModels[highlightedIndex].model_name);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setPopoverOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [popoverOpen, highlightedIndex, filteredModels, handleModelSelect, selectModelByIndex]);

  // Scroll to highlighted model when index changes
  useEffect(() => {
    if (popoverOpen && highlightedIndex >= 0 && highlightedIndex < modelRefs.current.length) {
      const element = modelRefs.current[highlightedIndex];
      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [popoverOpen, highlightedIndex]);

  // Reset highlighted index when search changes or popover state changes
  useEffect(() => {
    if (popoverOpen) {
      setHighlightedIndex(-1);
      modelRefs.current = modelRefs.current.slice(0, filteredModels.length);
    }
  }, [searchModel, popoverOpen, filteredModels.length]);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-between shadow-none gap-2 cursor-pointer text-foreground/70 hover:text-foreground border-none "
          onClick={() => setPopoverOpen(!popoverOpen)}
        >
          {selectedModelConfig?.label || selectedModel}
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 h-96 overflow-hidden p-0 scrollbar-none relative bg-background border-border/70 flex flex-col"
        align="end"
      >
        <div className="py-2 px-4 flex flex-row items-center gap-0 sticky top-0 z-10 bg-background/70 backdrop-blur-lg border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="w-full px-2 py-1 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none "
            placeholder="Search models..."
            value={searchModel}
            onChange={(e) => setSearchModel(e.target.value)}
          />
          <ModelManagementDialog
            orderedModels={orderedModels}
            preferences={preferences}
            onReorderModels={handleReorderModels}
            onToggleVisibility={handleToggleVisibility}
          />
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-1">
            {filteredModels.map((model, index) => (
              <div
                key={model.model_name}
                ref={(el) => setModelRef(index, el)}
                className={`flex items-center gap-2 px-3 py-3 cursor-pointer rounded-sm transition-colors justify-between hover:bg-accent/25 dark:hover:bg-accent/60 ${
                  model.model_name === selectedModel ? "bg-accent/20" : ""
                } ${
                  index === highlightedIndex ? "bg-accent/30 ring-1 ring-accent" : ""
                }`}
                onClick={() => handleModelSelect(model.model_name)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="text-foreground/80 flex gap-2 items-center justify-center">
                  <img
                    src={model.image}
                    aria-label={`${model.label} model icon`}
                    alt={model.label}
                    className={`h-4 w-4 opacity-80 ${
                      ["openai", "x-ai", "openrouter", "anthropic"].includes(
                        model.owner,
                      )
                        ? "dark:invert"
                        : ""
                    } `}
                  />
                  {model.label}
                  {index < 9 && (
                    <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-muted/60 text-muted-foreground rounded border">
                      {modifierKey}+{index + 1}
                    </kbd>
                  )}
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
                      className={`p-1 rounded-md ${toolSupportTag.parentClassName}`}
                    >
                      <Hammer
                        className={`h-4 w-4 ${toolSupportTag.className}`}
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

                  {/* Usage Rate Multiplier */}
                  {model.usageRateMultiplier !== 1.0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      <span className="font-medium">{model.usageRateMultiplier}x</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
