import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { createServer } from "vite";

const server = await createServer();
await server.listen();
const electronCli = path.resolve("node_modules/electron/cli.js");
const electron = spawn(process.execPath, [electronCli, "."], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RENDERER_URL: "http://127.0.0.1:1420" },
});

let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  electron.kill();
  await server.close();
  process.exit(code);
}

process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));
electron.on("exit", (code) => void stop(code ?? 0));
electron.on("error", (error) => { console.error(error); void stop(1); });
