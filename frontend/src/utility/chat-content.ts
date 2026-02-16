/**
 * Strips artifact XML (e.g. <boltArtifact>...</boltArtifact>) from assistant
 * message content and returns only the narrative text before and after.
 */
const BOLT_ARTIFACT_REGEX = /<boltArtifact[^>]*>[\s\S]*?<\/boltArtifact>/gi;

export function getNarrativeFromAssistantContent(content: string): string {
  const withoutArtifacts = content.replace(BOLT_ARTIFACT_REGEX, '').trim();
  return withoutArtifacts || 'Generated artifact';
}

const BOLT_MODIFICATIONS_REGEX = /<bolt_file_modifications>[\s\S]*?<\/bolt_file_modifications>/gi;

export function stripModificationsBlock(content: string): string {
  return content.replace(BOLT_MODIFICATIONS_REGEX, '').trim();
}
