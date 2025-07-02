import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";
import { useAtomValue } from "jotai";
import { selectedProjectIdAtom } from "@/store/chatStore";

export const ProjectsPanel = () => {
  const chatProjectId = useAtomValue(selectedProjectIdAtom);

  const showProjectList = !chatProjectId;

  if (showProjectList) {
    return <ProjectsList />;
  }

  return <ProjectDetails projectId={chatProjectId!} />;
};
