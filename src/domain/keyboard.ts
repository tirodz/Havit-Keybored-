export type KeyboardKey = {
  code: string;
  label: string;
  secondary?: string;
  hidUsage: string;
  keyIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type KeyTuple = [code: string, label: string, secondary: string | undefined, hidUsage: string, keyIndex: number, x: number, width: number];
type KeyRow = { y: number; keys: KeyTuple[] };

// Reconstructed from the 67 entries in the supplied keyboard software's
// rgb-keyboard.xml. Coordinates are normalized from its 800 x 300 canvas.
// The file declares a UI layout; it does not prove key-remapping support.
const rows: KeyRow[] = [
  { y: 35, keys: [
    ["Escape", "Esc", undefined, "0x29", 1, 25, 35],
    ["Digit1", "1", "!", "0x1e", 20, 75, 35], ["Digit2", "2", "@", "0x1f", 21, 122, 35],
    ["Digit3", "3", "#", "0x20", 22, 168, 35], ["Digit4", "4", "$", "0x21", 23, 216, 35],
    ["Digit5", "5", "%", "0x22", 24, 264, 35], ["Digit6", "6", "^", "0x23", 25, 312, 35],
    ["Digit7", "7", "&", "0x24", 26, 360, 35], ["Digit8", "8", "*", "0x25", 27, 408, 35],
    ["Digit9", "9", "(", "0x26", 28, 456, 35], ["Digit0", "0", ")", "0x27", 29, 503, 35],
    ["Minus", "-", "_", "0x2d", 30, 551, 35], ["Equal", "=", "+", "0x2e", 31, 599, 35],
    ["Backspace", "Backspace", undefined, "0x2a", 103, 647, 80],
    ["Insert", "Ins", undefined, "0x49", 116, 741, 35],
  ] },
  { y: 82, keys: [
    ["Tab", "Tab", undefined, "0x2b", 37, 25, 60],
    ["KeyQ", "Q", undefined, "0x14", 38, 98, 35], ["KeyW", "W", undefined, "0x1a", 39, 145, 35],
    ["KeyE", "E", undefined, "0x08", 40, 193, 35], ["KeyR", "R", undefined, "0x15", 41, 241, 35],
    ["KeyT", "T", undefined, "0x17", 42, 289, 35], ["KeyY", "Y", undefined, "0x1c", 43, 337, 35],
    ["KeyU", "U", undefined, "0x18", 44, 385, 35], ["KeyI", "I", undefined, "0x0c", 45, 432, 35],
    ["KeyO", "O", undefined, "0x12", 46, 479, 35], ["KeyP", "P", undefined, "0x13", 47, 527, 35],
    ["BracketLeft", "[", "{", "0x2f", 48, 575, 35], ["BracketRight", "]", "}", "0x30", 49, 622, 35],
    ["Backslash", "\\", "|", "0x31", 67, 669, 58], ["Delete", "Del", undefined, "0x4c", 119, 741, 35],
  ] },
  { y: 127, keys: [
    ["CapsLock", "Caps", undefined, "0x39", 55, 25, 72],
    ["KeyA", "A", undefined, "0x04", 56, 110, 35], ["KeyS", "S", undefined, "0x16", 57, 158, 35],
    ["KeyD", "D", undefined, "0x07", 58, 205, 35], ["KeyF", "F", undefined, "0x09", 59, 253, 35],
    ["KeyG", "G", undefined, "0x0a", 60, 300, 35], ["KeyH", "H", undefined, "0x0b", 61, 348, 35],
    ["KeyJ", "J", undefined, "0x0d", 62, 396, 35], ["KeyK", "K", undefined, "0x0e", 63, 443, 35],
    ["KeyL", "L", undefined, "0x0f", 64, 491, 35], ["Semicolon", ";", ":", "0x33", 65, 539, 35],
    ["Quote", "'", '"', "0x34", 66, 586, 35], ["Enter", "Enter", undefined, "0x28", 85, 634, 93],
    ["PageUp", "PgUp", undefined, "0x4b", 118, 741, 35],
  ] },
  { y: 176, keys: [
    ["ShiftLeft", "Shift", undefined, "0xe1", 73, 25, 94],
    ["KeyZ", "Z", undefined, "0x1d", 74, 134, 35], ["KeyX", "X", undefined, "0x1b", 75, 182, 35],
    ["KeyC", "C", undefined, "0x06", 76, 230, 35], ["KeyV", "V", undefined, "0x19", 77, 278, 35],
    ["KeyB", "B", undefined, "0x05", 78, 326, 35], ["KeyN", "N", undefined, "0x11", 79, 373, 35],
    ["KeyM", "M", undefined, "0x10", 80, 421, 35], ["Comma", ",", "<", "0x36", 81, 468, 35],
    ["Period", ".", ">", "0x37", 82, 516, 35], ["Slash", "/", "?", "0x38", 83, 563, 35],
    ["ShiftRight", "Shift", undefined, "0xe5", 84, 611, 68], ["ArrowUp", "▲", undefined, "0x52", 101, 692, 35],
    ["PageDown", "PgDn", undefined, "0x4e", 121, 741, 35],
  ] },
  { y: 224, keys: [
    ["ControlLeft", "Ctrl", undefined, "0xe0", 91, 25, 45], ["MetaLeft", "Win", undefined, "0xe3", 92, 87, 45],
    ["AltLeft", "Alt", undefined, "0xe2", 93, 147, 45], ["Space", "", undefined, "0x2c", 94, 207, 280],
    ["AltRight", "Alt", undefined, "0xe6", 95, 504, 45], ["Fn", "Fn", undefined, "0xaf", 96, 562, 45],
    ["ArrowLeft", "◀", undefined, "0x50", 99, 644, 35], ["ArrowDown", "▼", undefined, "0x51", 100, 692, 35],
    ["ArrowRight", "▶", undefined, "0x4f", 102, 741, 35],
  ] },
];

export const keyboardLayout: KeyboardKey[] = rows.flatMap(({ y, keys }) =>
  keys.map(([code, label, secondary, hidUsage, keyIndex, x, width]) => ({
    code, label, ...(secondary ? { secondary } : {}), hidUsage, keyIndex, x, y, width, height: 35,
  })),
);

export const allKeyCodes = keyboardLayout.map((key) => key.code);

export const keyChoices = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "Escape", "Tab", "Caps Lock", "Shift", "Control", "Alt", "Space", "Enter",
  "Backspace", "Delete", "Arrow Up", "Arrow Down", "Arrow Left", "Arrow Right",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
];
