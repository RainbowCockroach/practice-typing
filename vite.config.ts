import { defineConfig } from 'vite';

// Relative asset paths, so the built site works from any sub-path (GitHub Pages serves it at /practice-typing/).
export default defineConfig({
  base: './',
});
