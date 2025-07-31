export interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
}

export type ContentPart =
  | { type: "text"; content: string }
  | { type: "artifact"; artifact: Artifact };

export const parseContent = (rawContent: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  const chunks = rawContent.split(/<artifact/);

  if (chunks[0] && chunks[0].length > 0) {
    parts.push({ type: "text", content: chunks[0] });
  }

  for (let i = 1; i < chunks.length; i++) {
    const fullChunk = "<artifact" + chunks[i];
    const headerRegex =
      /<artifact\s+id="([^"]+)"\s+type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)"[^>]*>/;
    const headerMatch = fullChunk.match(headerRegex);

    if (headerMatch) {
      const [, id, type, language, title] = headerMatch;
      const header = headerMatch[0];
      let artifactContent = fullChunk.substring(header.length);
      let trailingText = "";

      const endTag = "</artifact>";
      const endTagIndex = artifactContent.indexOf(endTag);

      if (endTagIndex !== -1) {
        trailingText = artifactContent.substring(endTagIndex + endTag.length);
        artifactContent = artifactContent.substring(0, endTagIndex);
      }

      const artifact: Artifact = {
        id,
        type,
        language,
        title,
        content: artifactContent.trim(),
      };
      parts.push({ type: "artifact", artifact });

      if (trailingText) {
        parts.push({ type: "text", content: trailingText });
      }
    } else {
      parts.push({ type: "text", content: fullChunk });
    }
  }

  return parts;
};

// Parse artifacts from AI message content
export const parseArtifacts = (content: string): Artifact[] => {
  return parseContent(content)
    .filter(
      (part): part is { type: "artifact"; artifact: Artifact } =>
        part.type === "artifact",
    )
    .map((part) => part.artifact);
};
