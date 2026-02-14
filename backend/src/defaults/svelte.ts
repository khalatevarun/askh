import { buildArtifact } from "./utils";

const files = [
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + Svelte + TS</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
  },
  {
    path: "package.json",
    content: `{
  "name": "vite-svelte-typescript-starter",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-svelte": "^0.344.0",
    "svelte": "^4.2.19"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.1.0",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "svelte-check": "^3.7.0",
    "tslib": "^2.6.2",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
`,
  },
  {
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
`,
  },
  {
    path: "svelte.config.js",
    content: `import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
`,
  },
  {
    path: "tsconfig.json",
    content: `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`,
  },
  {
    path: "tsconfig.app.json",
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"]
}
`,
  },
  {
    path: "tsconfig.node.json",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
`,
  },
  {
    path: "tailwind.config.js",
    content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: { extend: {} },
  plugins: [],
};
`,
  },
  {
    path: "postcss.config.js",
    content: `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`,
  },
  {
    path: "src/vite-env.d.ts",
    content: `/// <reference types="vite/client" />
`,
  },
  {
    path: "src/main.ts",
    content: `import App from './App.svelte';
import './index.css';

const app = new App({ target: document.getElementById('app')! });

export default app;
`,
  },
  {
    path: "src/App.svelte",
    content: `<script lang="ts">
  import { Sparkles } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center gap-2">
  <Sparkles class="w-5 h-5 text-gray-600" />
  <p>Start prompting (or editing) to see magic happen :)</p>
</div>
`,
  },
  {
    path: "src/index.css",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
  },
];

export const basePrompt = buildArtifact(files);
