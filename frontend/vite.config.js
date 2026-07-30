import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function canisterIdsPlugin() {
  return {
    name: "canister-ids",
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), "");
      const network = env.DFX_NETWORK || "local";
      const idsPath = path.resolve(__dirname, `../.dfx/${network}/canister_ids.json`);
      const define = {
        "import.meta.env.DFX_NETWORK": JSON.stringify(network),
      };

      if (fs.existsSync(idsPath)) {
        const ids = JSON.parse(fs.readFileSync(idsPath, "utf8"));
        if (ids.scalespace) {
          define["import.meta.env.VITE_CANISTER_ID_SCALESPACE"] = JSON.stringify(
            ids.scalespace[network] || ids.scalespace.local
          );
        }
        if (ids.messaging) {
          define["import.meta.env.VITE_CANISTER_ID_MESSAGING"] = JSON.stringify(
            ids.messaging[network] || ids.messaging.local
          );
        }
      }

      // Also read frontend/.env.local if dfx wrote CANISTER_ID_* there
      const envLocal = path.resolve(__dirname, ".env.local");
      if (fs.existsSync(envLocal)) {
        const text = fs.readFileSync(envLocal, "utf8");
        for (const line of text.split("\n")) {
          const m = line.match(/^CANISTER_ID_([A-Z0-9_]+)=(.+)$/);
          if (m) {
            const key = m[1].toLowerCase();
            if (key === "scalespace") {
              define["import.meta.env.VITE_CANISTER_ID_SCALESPACE"] = JSON.stringify(m[2].trim());
            }
            if (key === "messaging") {
              define["import.meta.env.VITE_CANISTER_ID_MESSAGING"] = JSON.stringify(m[2].trim());
            }
          }
        }
      }

      return { define };
    },
  };
}

export default defineConfig({
  plugins: [react(), canisterIdsPlugin()],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  define: {
    global: "window",
  },
});
