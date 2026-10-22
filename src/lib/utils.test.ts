import { describe, expect, it } from "vitest";
import { avatarColor, randomInt, randomString, uid } from "@/lib/utils";

describe("utils — randomString", () => {
  it("menghasilkan string sepanjang yang diminta", () => {
    expect(randomString(12)).toHaveLength(12);
    expect(randomString(1)).toHaveLength(1);
    expect(randomString(0)).toBe("");
  });

  it("hanya memakai karakter dari alfabet yang diminta", () => {
    const alphabet = "ABC123";
    const token = randomString(64, alphabet);
    expect([...token].every((c) => alphabet.includes(c))).toBe(true);
  });

  it("berbeda antar pemanggilan", () => {
    expect(randomString(16)).not.toBe(randomString(16));
  });
});

describe("utils — randomInt", () => {
  it("selalu berada di rentang [0, max)", () => {
    for (let i = 0; i < 200; i++) {
      const value = randomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it("mengembalikan 0 bila rentang tidak punya pilihan lain", () => {
    expect(randomInt(0)).toBe(0);
    expect(randomInt(1)).toBe(0);
  });
});

describe("utils — uid", () => {
  it("memakai prefix dan menghasilkan id yang unik", () => {
    const ids = Array.from({ length: 200 }, () => uid("x-"));
    expect(ids.every((id) => id.startsWith("x-"))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("utils — avatarColor", () => {
  it("deterministik dan memakai palet warna yang tersedia", () => {
    const palette = [
      "--color-primary",
      "--color-secondary",
      "--color-tertiary",
      "--color-info",
      "--color-warning",
    ];
    expect(avatarColor("budi.santoso@kampus.id")).toBe(
      avatarColor("budi.santoso@kampus.id"),
    );
    expect(palette).toContain(avatarColor("budi.santoso@kampus.id"));
  });
});
