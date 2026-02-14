/**
 * Builds a boltArtifact XML string from a list of virtual files.
 * Use this to keep template contents readable while matching the React artifact format.
 */
export function buildArtifact(files: { path: string; content: string }[]): string {
  const parts = files.map(
    (f) =>
      `<boltAction type="file" filePath="${f.path.replace(/"/g, "&quot;")}">${f.content}</boltAction>`
  );
  return `<boltArtifact id="project-import" title="Project Files">${parts.join("")}</boltArtifact>`;
}
