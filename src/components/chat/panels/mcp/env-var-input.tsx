import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { EnvVar } from "./types";

interface EnvVarInputProps {
  envVars: EnvVar[];
  onUpdate: (envVars: EnvVar[]) => void;
}

export const EnvVarInput = ({ envVars, onUpdate }: EnvVarInputProps) => {
  const addEnvVar = () => {
    onUpdate([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    onUpdate(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    onUpdate(
      envVars.map((env, i) => (i === index ? { ...env, [field]: value } : env)),
    );
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    // Only process paste if the input is empty
    const currentEnvVar = envVars[index];
    if (currentEnvVar.key !== "" || currentEnvVar.value !== "") {
      return;
    }

    // Prevent default paste behavior
    e.preventDefault();

    // Get pasted text
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.trim()) return;

    // Try to parse as environment variables
    const parsedEnvVars = parseEnvVars(pastedText);

    // If we have parsed env vars, update state with them
    if (parsedEnvVars.length > 0) {
      // Replace the current empty env var with the parsed ones
      const newEnvVars = [
        ...envVars.slice(0, index),
        ...parsedEnvVars,
        ...envVars.slice(index + 1),
      ];
      onUpdate(newEnvVars);
    }
  };

  const parseEnvVars = (text: string): EnvVar[] => {
    const result: EnvVar[] = [];

    // Split by newlines
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;

      // Try to match KEY=VALUE pattern
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        result.push({
          key: match[1].trim(),
          value: match[2].trim(),
        });
      }
    }

    return result;
  };

  return (
    <div className="space-y-2">
      {envVars.map((env, index) => (
        <div key={index} className="flex gap-2">
          <Input
            placeholder="Key"
            value={env.key}
            onChange={(e) => updateEnvVar(index, "key", e.target.value)}
            onPaste={(e) => handlePaste(e, index)}
          />
          <span className="flex items-center">:</span>
          <Input
            placeholder="Value"
            value={env.value}
            onChange={(e) => updateEnvVar(index, "value", e.target.value)}
            onPaste={(e) => handlePaste(e, index)}
          />
          {index === envVars.length - 1 ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addEnvVar}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeEnvVar(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
