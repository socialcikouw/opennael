import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { jsonNative } from "./native";

describe("tema-native.json", () => {
  test("sinkron dengan token — bila gagal: bun apps/mobile/scripts/tulis-tema-native.ts", () => {
    const berkas = readFileSync(join(import.meta.dir, "../../tema-native.json"), "utf8");
    expect(berkas).toBe(jsonNative());
  });
});
