import { describe, expect, it, beforeEach } from "vitest";
import {
  createDefaultDocument,
  readStoredDocument,
  STORAGE_KEY,
  validateProfileDocument,
  writeStoredDocument,
} from "./profiles";

describe("profile documents", () => {
  beforeEach(() => localStorage.clear());

  it("accepts and preserves a valid versioned profile document", () => {
    const document = createDefaultDocument(new Date("2026-01-02T03:04:05.000Z"));
    expect(validateProfileDocument(document)).toEqual(document);
  });

  it("rejects unsupported document versions", () => {
    const document = createDefaultDocument();
    expect(() => validateProfileDocument({ ...document, version: 99 })).toThrow(/not a supported/);
  });

  it("rejects out-of-range lighting values", () => {
    const document = createDefaultDocument();
    document.profiles[0].lighting.brightness = 101;
    expect(() => validateProfileDocument(document)).toThrow(/brightness must be between/);
  });

  it("rejects assignments to keys outside the modeled layout", () => {
    const document = createDefaultDocument();
    document.profiles[0].keyMap["NumLock"] = "A";
    expect(() => validateProfileDocument(document)).toThrow(/invalid key assignment/);
  });

  it("round-trips through local storage", () => {
    const document = createDefaultDocument();
    writeStoredDocument(document);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(readStoredDocument()).toEqual(document);
  });

  it("recovers to the default document when stored JSON is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    expect(readStoredDocument().activeProfileId).toBe("default-profile");
  });
});
