import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSetAtom } from "jotai";
import { selectedProjectIdAtom } from "@/store/chatStore";

export const useProjects = (numItems: number) => {
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);

  const projects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems, cursor: null },
  });

  if (projects?.page.length === 0) {
    setSelectedProjectId(null);
  }

  return { projects };
};
