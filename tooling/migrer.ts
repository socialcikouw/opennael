import { fileURLToPath } from "node:url";
import { pastikanDatabasePengembangan } from "../apps/api/src/db/penjaga";

// Ce script local ne peut jamais appliquer une migration à la production.
pastikanDatabasePengembangan(process.env.DATABASE_URL);
const cwd = fileURLToPath(new URL("../apps/api", import.meta.url));
const bin = fileURLToPath(new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url));
const proses = Bun.spawn([process.execPath, bin, "migrate"], {
  cwd,
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(await proses.exited);
