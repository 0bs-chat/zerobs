import { atom, useAtom } from "jotai";
import type { Doc } from "../../convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export const apiKeysAtom = atom<Doc<"apiKeys">[]>([]);

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useAtom(apiKeysAtom);
  const { data: existingKeys } = useQuery(convexQuery(api.apiKeys.queries.getAll, {}));
  useEffect(() => {
    setApiKeys(existingKeys ?? []);
  }, [existingKeys]);
  return { apiKeys, setApiKeys };
};