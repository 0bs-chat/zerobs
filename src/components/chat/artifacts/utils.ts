export interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
  messageIndex: number;
  createdAt: Date;
}

// Parse artifacts from AI message content
export const parseArtifacts = (content: string, messageIndex: number): Artifact[] => {
  const artifactRegex = /<artifact\s+id="([^"]+)"\s+type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/artifact>/g;
  const artifacts: Artifact[] = [];
  let match;

  while ((match = artifactRegex.exec(content)) !== null) {
    const [, id, type, language, title, artifactContent] = match;
    artifacts.push({
      id,
      type,
      language,
      title,
      content: artifactContent.trim(),
      messageIndex,
      createdAt: new Date(), // In a real app, this would come from message timestamp
    });
  }

  return artifacts;
}; 