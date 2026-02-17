import { buildArtifact } from "./utils";

const files = [
  {
    path: "index.js",
    content: `// run \`node index.js\` in the terminal

console.log(\`Hello Node.js v\${process.versions.node}!\`);
`,
  },
  {
    path: "package.json",
    content: `{
  "name": "node-starter",
  "private": true,
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  }
}
`,
  },
];

export const basePrompt = buildArtifact(files);
