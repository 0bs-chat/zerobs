import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { modelPreferencesAtom } from "../../store/chatStore";
import { models } from "../../../convex/langchain/models";

export function useModels() {
  const preferences = useAtomValue(modelPreferencesAtom);

  const orderedModels = useMemo(() => {
    const allModels = [...models];
    const modelMap = new Map(
      allModels.map((model) => [model.model_name, model]),
    );

    // Start with models in the preferred order
    const orderedModels = preferences.order
      .map((modelName) => modelMap.get(modelName))
      .filter(Boolean) as typeof models;

    // Add any new models that aren't in the order yet
    const orderedModelNames = new Set(preferences.order);
    const newModels = allModels.filter(
      (model: (typeof models)[number]) =>
        !orderedModelNames.has(model.model_name) &&
        !preferences.hidden.includes(model.model_name),
    );

    return [...orderedModels, ...newModels];
  }, [preferences]);

  const visibleModels = useMemo(() => {
    return orderedModels.filter(
      (model: (typeof models)[number]) =>
        !preferences.hidden.includes(model.model_name),
    );
  }, [orderedModels, preferences.hidden]);

  return {
    orderedModels,
    visibleModels,
    preferences,
  };
}
