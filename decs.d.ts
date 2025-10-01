// FIX: Replaced the non-working `vite/client` reference with a manual definition
// for `ImportMetaEnv`. This resolves the error about `import.meta.env` not being
// defined, and the error about `vite/client` types not being found.
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// This declaration allows TypeScript to understand CSS module imports,
// preventing errors like "Cannot find module './src/input.css'".
// Vite processes these imports to handle styling.
declare module '*.css';
