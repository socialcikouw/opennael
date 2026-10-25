/**
 * Kirim OTA EAS Update ke satu jalur HP — hanya dari `main` yang bersih dan
 * sama dengan GitHub: OTA `preview` langsung sampai ke HP karyawan (APK
 * lapangan), `expogo` ke Expo Go (iPhone pemilik).
 *
 * Dari root: `bun run update:preview --message "<isi>"` atau
 * `bun run update:expogo --message "<isi>"`. Sengaja di root, bukan di
 * `scripts` `apps/mobile/package.json` yang ikut sidik jari runtime APK.
 */
import { join } from "node:path";
import { $ } from "bun";

/** Argumen tambahan `eas update` per jalur; API keduanya dari lingkungan EAS `preview`. */
const JALUR: Record<string, string[]> = {
  preview: ["--platform", "android"],
  expogo: [],
};

function tolak(pesan: string): never {
  console.error(`Ditolak: ${pesan}`);
  process.exit(1);
}

const [jalur, ...lainnya] = process.argv.slice(2);
const tambahan = jalur ? JALUR[jalur] : undefined;
if (!jalur || !tambahan) tolak(`jalur harus salah satu dari: ${Object.keys(JALUR).join(", ")}.`);

const branch = (await $`git branch --show-current`.text()).trim();
if (branch !== "main") {
  tolak(
    `OTA hanya dari branch main (sekarang: ${branch || "tanpa branch"}). Gabung dev ke main dulu.`,
  );
}
if ((await $`git status --porcelain`.text()).trim()) {
  tolak("ada perubahan yang belum di-commit.");
}
await $`git fetch -q origin main`;
const lokal = (await $`git rev-parse HEAD`.text()).trim();
const github = (await $`git rev-parse origin/main`.text()).trim();
if (lokal !== github) tolak("main belum sama dengan GitHub — push atau tarik dulu.");

const { exitCode } =
  await $`bunx eas-cli update --channel ${jalur} --environment preview ${tambahan} ${lainnya}`
    .cwd(join(import.meta.dir, "..", "apps", "mobile"))
    .env({ ...process.env, APP_VARIANT: jalur })
    .nothrow();
process.exit(exitCode);
