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
    <title>Vite + Vue + TS</title>
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
  "name": "vite-vue-typescript-starter",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-vue-next": "^0.344.0",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.4",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2",
    "vue-tsc": "^2.0.6"
  }
}
`,
  },
  {
    path: "vite.config.ts",
    content: `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
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
    "noFallthroughCasesInSwitch": true,
    "jsx": "preserve"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
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
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
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

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
`,
  },
  {
    path: "src/main.ts",
    content: `import { createApp } from 'vue';
import App from './App.vue';
import './index.css';

createApp(App).mount('#app');
`,
  },
  {
    path: "src/App.vue",
    content: `<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next';
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center gap-2">
    <Sparkles class="w-5 h-5 text-gray-600" />
    <p>Start prompting (or editing) to see magic happen :)</p>
  </div>
</template>
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
