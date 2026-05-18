import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Use "/" base path for IIS deployment at site root
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  // 👇 Base path: "/" for both dev and IIS deployment at site root
  base: "/",


  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
        ]
      : []),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },

  root: path.resolve(import.meta.dirname, "client"),

  build: {
    // 👇 Put final build directly in `dist`
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      plugins: [
        {
          name: 'copy-iis-config',
          closeBundle() {
            // Copy web.config for IIS deployment
            const webConfigFrom = path.resolve(import.meta.dirname, "web.config");
            const webConfigTo = path.resolve(import.meta.dirname, "dist/web.config");
            if (fs.existsSync(webConfigFrom)) {
              fs.copyFileSync(webConfigFrom, webConfigTo);
              console.log('✅ Copied web.config to dist/');
            }
            
            // Copy PHP folder to dist for PHP backend deployment
            const phpFrom = path.resolve(import.meta.dirname, "php");
            const phpTo = path.resolve(import.meta.dirname, "dist/php");
            if (fs.existsSync(phpFrom)) {
              if (!fs.existsSync(phpTo)) fs.mkdirSync(phpTo, { recursive: true });
              // Simple recursive copy for directories
              const copyDir = (src: string, dest: string) => {
                const files = fs.readdirSync(src);
                for (const file of files) {
                  const s = path.join(src, file);
                  const d = path.join(dest, file);
                  if (fs.statSync(s).isDirectory()) {
                    if (!fs.existsSync(d)) fs.mkdirSync(d);
                    copyDir(s, d);
                  } else {
                    fs.copyFileSync(s, d);
                  }
                }
              };
              copyDir(phpFrom, phpTo);
              console.log('✅ Copied php/ folder to dist/');
            }

            // Restore uploads: copy all files from project-root uploads/ into dist/uploads/
            const uploadsTo = path.resolve(import.meta.dirname, "dist/uploads");
            if (!fs.existsSync(uploadsTo)) fs.mkdirSync(uploadsTo, { recursive: true });
            
            // Copy any files from the source uploads/ folder
            const uploadsSrc = path.resolve(import.meta.dirname, "uploads");
            if (fs.existsSync(uploadsSrc)) {
              const copyUploads = (src: string, dest: string) => {
                const entries = fs.readdirSync(src);
                for (const entry of entries) {
                  const s = path.join(src, entry);
                  const d = path.join(dest, entry);
                  if (fs.statSync(s).isDirectory()) {
                    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
                    copyUploads(s, d);
                  } else {
                    fs.copyFileSync(s, d);
                  }
                }
              };
              copyUploads(uploadsSrc, uploadsTo);
            }
            console.log('✅ Restored uploads/ folder in dist/');

            // Copy site-engg storage.json to dist/php for visibility
            const storageFrom = path.resolve(import.meta.dirname, "server/site-engg/storage.json");
            const storageTo = path.resolve(import.meta.dirname, "dist/php/site-engg-storage.json");
            if (fs.existsSync(storageFrom)) {
              fs.copyFileSync(storageFrom, storageTo);
              console.log('✅ Copied storage.json to dist/php/');
            }

            // Copy _redirects (for Netlify/other platforms)
            const from = path.resolve(import.meta.dirname, "_redirects");
            const to = path.resolve(import.meta.dirname, "dist/_redirects");
            if (fs.existsSync(from)) {
              fs.copyFileSync(from, to);
            }
          }
        }
      ]
    }
  },
});
