import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

export default defineConfig({
  plugins: [react()],
  base: '/pun/dev/pryon_chatbot/', // Base path for deployment
  build: {
      outDir: '../../backend/static/build', // Output directory for the build
      emptyOutDir: true,
  },
});
