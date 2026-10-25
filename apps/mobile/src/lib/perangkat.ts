import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { waktuPendek } from "./format";

/** Keterangan HP ini untuk daftar perangkat tertaut di aplikasi bos (web). */
export function infoPerangkat(): { nama?: string; platform: "android" | "ios" } {
  const nama = Constants.deviceName?.slice(0, 100);
  return { ...(nama ? { nama } : {}), platform: Platform.OS === "ios" ? "ios" : "android" };
}

/**
 * JS yang sedang jalan: "Versi 1.0.0 · bawaan APK" atau
 * "Versi 1.0.0 · pembaruan a1b2c3d · 26 Okt 04.55" (OTA EAS Update) — untuk
 * memastikan pembaruan OTA sudah masuk.
 */
export function versiAplikasi(): string {
  const versi = `Versi ${Constants.expoConfig?.version ?? "?"}`;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return `${versi} · Expo Go`;
  }
  if (!Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.updateId) {
    return `${versi} · bawaan APK`;
  }
  const waktu = Updates.createdAt ? ` · ${waktuPendek(Updates.createdAt)}` : "";
  return `${versi} · pembaruan ${Updates.updateId.slice(0, 7)}${waktu}`;
}
