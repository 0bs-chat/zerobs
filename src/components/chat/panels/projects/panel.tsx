import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";
import { useAtomValue } from "jotai";
import { selectedProjectIdAtom } from "@/store/chatStore";

export const ProjectsPanel = () => {
  const chatProjectId = useAtomValue(selectedProjectIdAtom);

  if (!chatProjectId) {
    return <ProjectsList />;
  }
  
  return <ProjectDetails projectId={chatProjectId!} />;
};
