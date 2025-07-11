import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface EnvVarInputProps {
  envVars: Record<string, string>;
  onUpdate: (envVars: Record<string, string>) => void;
}

interface EnvVar {
  key: string;
  value: string;
}

export const EnvVarInput = ({ envVars, onUpdate }: EnvVarInputProps) => {
  // Convert Record to array for easier manipulation
  const envVarArray: EnvVar[] = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
  }));

  // Ensure there's always at least one empty row
  const displayEnvVars =
    envVarArray.length === 0
      ? [{ key: "", value: "" }]
      : [...envVarArray, { key: "", value: "" }];

  const convertToRecord = (envArray: EnvVar[]): Record<string, string> => {
    const result: Record<string, string> = {};
    envArray.forEach(({ key, value }) => {
      if (key.trim() !== "") {
        result[key.trim()] = value;
      }
    });
    return result;
  };

  const addEnvVar = () => {
    // Add another empty row to the existing env vars
    onUpdate(convertToRecord([...envVarArray, { key: "", value: "" }]));
  };

  const removeEnvVar = (index: number) => {
    // Remove the env var at the given index from the actual env vars array
    const newEnvVars = envVarArray.filter((_, i) => i !== index);
    onUpdate(convertToRecord(newEnvVars));
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const newEnvVars = [...displayEnvVars];
    newEnvVars[index] = { ...newEnvVars[index], [field]: value };
    
    // Filter out the last empty row before converting to record
    const envVarsToUpdate = newEnvVars.slice(0, -1);
    
    // If we're updating the last (empty) row and it now has content, include it
    if (index === newEnvVars.length - 1 && (newEnvVars[index].key.trim() || newEnvVars[index].value.trim())) {
      envVarsToUpdate.push(newEnvVars[index]);
    }
    
    onUpdate(convertToRecord(envVarsToUpdate));
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    // Only try bulk parsing if pasting into an empty row's key field
    const currentEnvVar = displayEnvVars[index];
    const isEmptyRow = currentEnvVar.key === "" && currentEnvVar.value === "";
    const isKeyField = (e.target as HTMLInputElement).placeholder === "Key";
    
    if (!isEmptyRow || !isKeyField) {
      // Allow normal paste behavior
      return;
    }

    // Get pasted text
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.trim()) return;

    // Try to parse as environment variables (only if it looks like env vars)
    const parsedEnvVars = parseEnvVars(pastedText);

    // Only prevent default paste if we successfully parsed multiple env vars
    if (parsedEnvVars.length > 1) {
      e.preventDefault();
      
      // Replace the current empty env var with the parsed ones
      const newEnvVars = [
        ...displayEnvVars.slice(0, index),
        ...parsedEnvVars,
        ...displayEnvVars.slice(index + 1),
      ];
      onUpdate(convertToRecord(newEnvVars));
    }
    // If parsedEnvVars.length <= 1, allow normal paste behavior
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
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch) {
        result.push({
          key: keyValueMatch[1].trim(),
          value: keyValueMatch[2].trim(),
        });
        continue;
      }

      // Try to match JSON-style "KEY": "VALUE" pattern (with or without trailing comma)
      const jsonMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*"([^"]*)"[,]?$/);
      if (jsonMatch) {
        result.push({
          key: jsonMatch[1].trim(),
          value: jsonMatch[2].trim(),
        });
        continue;
      }

      // Try to match JSON-style "KEY": value pattern (for non-string values like numbers, booleans)
      const jsonValueMatch = trimmedLine.match(/^"([^"]+)"\s*:\s*([^,\s]+)[,]?$/);
      if (jsonValueMatch) {
        result.push({
          key: jsonValueMatch[1].trim(),
          value: jsonValueMatch[2].trim(),
        });
        continue;
      }
    }

    return result;
  };

  return (
    <div className="space-y-2">
      {displayEnvVars.map((env, index) => (
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
          {index === displayEnvVars.length - 1 ? (
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
