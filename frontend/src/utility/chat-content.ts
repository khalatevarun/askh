/**
 * Strips artifact XML (e.g. <boltArtifact>...</boltArtifact>) from assistant
 * message content and returns only the narrative text before and after.
 */
const BOLT_ARTIFACT_REGEX = /<boltArtifact[^>]*>[\s\S]*?<\/boltArtifact>/gi;

export function getNarrativeFromAssistantContent(content: string): string {
  const withoutArtifacts = content.replace(BOLT_ARTIFACT_REGEX, '').trim();
  return withoutArtifacts || 'Generated artifact';
}
