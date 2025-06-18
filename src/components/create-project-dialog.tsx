import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  projectDialogOpenAtom,
  rightPanelVisibilityAtom,
  rightPanelActiveTabAtom,
} from "@/store/chatStore";
import { useAtom, useSetAtom } from "jotai";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";

export const CreateProjectDialog = () => {
  const [projectDialogOpen, setProjectDialogOpen] = useAtom(
    projectDialogOpenAtom,
  );
  const setRightPanelVisible = useSetAtom(rightPanelVisibilityAtom);
  const setRightPanelActiveTab = useSetAtom(rightPanelActiveTabAtom);
  const createProject = useMutation(api.projects.mutations.create);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats"> | "new";

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name.trim()) return;

    const project = await createProject({
      name,
      description: description.trim() || undefined,
    });

    setProjectDialogOpen(false);
    await updateChatInputMutation({
      chatId,
      updates: {
        projectId: project._id,
      },
    });
    setRightPanelVisible(true);
    setRightPanelActiveTab("projects");
  };

  return (
    <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateProject} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name">Name</label>
            <Input id="name" name="name" placeholder="Project name" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="description">Description (Optional)</label>
            <Textarea
              id="description"
              name="description"
              placeholder="Project description"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setProjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
