import { fileURLToPath } from "node:url";
import { pastikanDatabasePengembangan } from "../src/platform/db/penjaga";

// Skrip lokal ini tidak pernah boleh menerapkan migrasi ke produksi.
pastikanDatabasePengembangan(process.env.DATABASE_URL);
const cwd = fileURLToPath(new URL("..", import.meta.url));
const bin = fileURLToPath(new URL("../../../node_modules/drizzle-kit/bin.cjs", import.meta.url));
const proses = Bun.spawn([process.execPath, bin, "migrate"], {
  cwd,
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(await proses.exited);
