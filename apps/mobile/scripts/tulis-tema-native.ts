import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonNative } from "../src/tema/native";

/**
 * Hasilkan `apps/mobile/tema-native.json` dari token tema (dibaca `app.config.ts`):
 * `bun apps/mobile/scripts/tulis-tema-native.ts`. Dijalankan setiap token yang berkaitan
 * dengan native berubah; `src/tema/native.test.ts` menggagalkan `bun run test` bila lupa.
 */
const tujuan = join(import.meta.dir, "../tema-native.json");
writeFileSync(tujuan, jsonNative());
console.log(`Ditulis: ${tujuan}`);
