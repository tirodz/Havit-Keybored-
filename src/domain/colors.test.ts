import { describe, expect, it } from "vitest";
import { formatHexColorDraft, isHexColorDraft, parseHexColor } from "./colors";

describe("hex color input", () => {
  it("accepts partial entry while a color is being typed", () => {
    expect(isHexColorDraft("#")).toBe(true);
    expect(isHexColorDraft("#3F")).toBe(true);
    expect(formatHexColorDraft("ff")).toBe("#FF");
    expect(parseHexColor("#FF")).toBeNull();
  });

  it("normalizes a complete color with or without the prefix", () => {
    expect(parseHexColor("#ff00aA")).toBe("#FF00AA");
    expect(parseHexColor("ff00aa")).toBe("#FF00AA");
  });

  it("rejects non-hex characters and values longer than six digits", () => {
    expect(isHexColorDraft("#12xz")).toBe(false);
    expect(isHexColorDraft("#1234567")).toBe(false);
    expect(parseHexColor("#12345")).toBeNull();
  });
});
