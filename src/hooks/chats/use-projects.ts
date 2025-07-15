import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export const useProjects = (numItems: number) => {
  const projects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems, cursor: null },
  });

  return projects;
};
