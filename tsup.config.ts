import { defineConfig } from 'tsup';

export default defineConfig({
  // Define os pontos de entrada (na imagem você tem index e browser)
  entry: ['src/index.ts', 'src/browser.ts'],
  
  // Gera os formatos CommonJS (.cjs) e ESM (.mjs)
  format: ['cjs', 'esm'],
  
  // Gera os arquivos de tipagem (.d.ts, .d.mts, .d.cts)
  dts: true,
  
  // Limpa a pasta dist antes de cada build
  clean: true,
  
  // Opcional: minificar o código para produção
  minify: false, 
  
  // Garante que o código seja empacotado
  splitting: false,
  
  // Output directory
  outDir: 'dist',
});