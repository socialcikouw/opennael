import pino, { type DestinationStream, type Logger } from "pino";

export type Log = Logger;

export const TINGKAT_LOG = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
export type TingkatLog = (typeof TINGKAT_LOG)[number];

/**
 * Jalur yang tidak boleh sampai ke log walau ada yang tidak sengaja
 * mencatatnya: token, kata sandi, hash, dan header otorisasi. Log dicatat
 * tanpa isi permintaan, tanpa query string, dan tanpa alamat klien — ini
 * hanya jaring pengaman kedua.
 */
const SENSOR = [
  "authorization",
  "*.authorization",
  "token",
  "*.token",
  "tokenAkses",
  "*.tokenAkses",
  "tokenSegar",
  "*.tokenSegar",
  "kataSandi",
  "*.kataSandi",
  "kata_sandi",
  "*.kata_sandi",
  "hashSandi",
  "*.hashSandi",
];

/** Log terstruktur JSON ke stdout; `tujuan` hanya diganti di uji. */
export function buatLog(tingkat: TingkatLog = "info", tujuan?: DestinationStream): Log {
  return pino(
    {
      level: tingkat,
      base: { layanan: "opennael-api" },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: { paths: SENSOR, censor: "[disensor]" },
    },
    tujuan,
  );
}

/** Log yang membuang semuanya — bawaan `buatApp` supaya uji tidak berisik. */
export const logDiam: Log = buatLog("silent");
