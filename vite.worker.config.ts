import { defineConfig } from 'vite'
export default defineConfig({build:{emptyOutDir:false,lib:{entry:'src/background/service-worker.ts',formats:['es'],fileName:()=> 'service-worker.js'},rollupOptions:{output:{inlineDynamicImports:true}}}})
