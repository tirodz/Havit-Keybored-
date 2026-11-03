const HEX_COLOR_DRAFT = /^#?[\da-fA-F]{0,6}$/;
const HEX_COLOR = /^#?([\da-fA-F]{6})$/;

export function isHexColorDraft(value: string): boolean {
  return HEX_COLOR_DRAFT.test(value);
}

export function formatHexColorDraft(value: string): string {
  const normalized = value.toUpperCase();
  return normalized.startsWith("#") ? normalized : `#${normalized}`;
}

export function parseHexColor(value: string): string | null {
  const match = HEX_COLOR.exec(value);
  return match ? `#${match[1].toUpperCase()}` : null;
}
