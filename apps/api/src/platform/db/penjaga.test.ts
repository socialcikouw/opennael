import { describe, expect, test } from "bun:test";
import { pastikanDatabasePengembangan } from "./penjaga";

describe("penjaga database pengembangan", () => {
  test("hanya Supabase yang diizinkan", () => {
    expect(() =>
      pastikanDatabasePengembangan("postgresql://u:p@x.pooler.supabase.com:6543/postgres"),
    ).not.toThrow();
    expect(() => pastikanDatabasePengembangan("postgresql://u:p@10.0.0.5:5432/nael")).toThrow(
      "bukan Supabase pengembangan",
    );
    expect(() => pastikanDatabasePengembangan(undefined)).toThrow("tidak sah");
  });
});
