import { allKeyCodes } from "./keyboard";

export type LightingEffect = "Static" | "Breathing" | "Wave" | "Reactive";

export type MacroStep = {
  id: string;
  key: string;
  delayMs: number;
};

export type Macro = {
  id: string;
  name: string;
  steps: MacroStep[];
};

export type Profile = {
  id: string;
  name: string;
  createdAt: string;
  lighting: {
    effect: LightingEffect;
    color: string;
    brightness: number;
    speed: number;
  };
  keyMap: Record<string, string>;
  macros: Macro[];
};

export type ProfileDocument = {
  format: "havit-control-center-profile";
  version: 1;
  profiles: Profile[];
  activeProfileId: string;
};

export const STORAGE_KEY = "havit-control-center.profiles.v1";

export function createProfile(name: string, now = new Date()): Profile {
  const safeName = name.trim();
  if (!safeName) throw new Error("Give the profile a name.");
  return {
    id: crypto.randomUUID(),
    name: safeName,
    createdAt: now.toISOString(),
    lighting: { effect: "Static", color: "#63a6ff", brightness: 72, speed: 45 },
    keyMap: {},
    macros: [],
  };
}

export function createDefaultProfile(now = new Date()): Profile {
  return {
    id: "default-profile",
    name: "Balanced",
    createdAt: now.toISOString(),
    lighting: { effect: "Wave", color: "#63a6ff", brightness: 58, speed: 42 },
    keyMap: {},
    macros: [],
  };
}

export function createDefaultDocument(now = new Date()): ProfileDocument {
  const profile = createDefaultProfile(now);
  return {
    format: "havit-control-center-profile",
    version: 1,
    profiles: [profile],
    activeProfileId: profile.id,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProfileDocument(value: unknown): ProfileDocument {
  if (!isRecord(value) || value.format !== "havit-control-center-profile" || value.version !== 1) {
    throw new Error("This file is not a supported Control Center profile export.");
  }
  if (!Array.isArray(value.profiles) || value.profiles.length === 0) {
    throw new Error("The profile file must contain at least one profile.");
  }

  const profiles = value.profiles.map((candidate, index): Profile => {
    if (!isRecord(candidate) || typeof candidate.id !== "string" || typeof candidate.name !== "string" || !candidate.name.trim()) {
      throw new Error(`Profile ${index + 1} is missing a valid id or name.`);
    }
    if (typeof candidate.createdAt !== "string" || !Number.isFinite(Date.parse(candidate.createdAt))) {
      throw new Error(`Profile ${index + 1} has an invalid creation date.`);
    }
    if (!isRecord(candidate.lighting)) throw new Error(`Profile ${index + 1} has no lighting settings.`);
    const lighting = candidate.lighting;
    const effects: LightingEffect[] = ["Static", "Breathing", "Wave", "Reactive"];
    if (!effects.includes(lighting.effect as LightingEffect)) throw new Error(`Profile ${index + 1} has an unknown simulated effect.`);
    if (typeof lighting.color !== "string" || !/^#[\da-fA-F]{6}$/.test(lighting.color)) throw new Error(`Profile ${index + 1} has an invalid color.`);
    if (!Number.isInteger(lighting.brightness) || Number(lighting.brightness) < 0 || Number(lighting.brightness) > 100) {
      throw new Error(`Profile ${index + 1} brightness must be between 0 and 100.`);
    }
    if (!Number.isInteger(lighting.speed) || Number(lighting.speed) < 0 || Number(lighting.speed) > 100) {
      throw new Error(`Profile ${index + 1} speed must be between 0 and 100.`);
    }
    if (!isRecord(candidate.keyMap)) throw new Error(`Profile ${index + 1} has an invalid key map.`);
    const keyMap: Record<string, string> = {};
    for (const [key, mapped] of Object.entries(candidate.keyMap)) {
      if (!allKeyCodes.includes(key) || typeof mapped !== "string" || !mapped.trim()) {
        throw new Error(`Profile ${index + 1} has an invalid key assignment.`);
      }
      keyMap[key] = mapped;
    }
    if (!Array.isArray(candidate.macros)) throw new Error(`Profile ${index + 1} has invalid macros.`);
    const macros = candidate.macros.map((macro, macroIndex): Macro => {
      if (!isRecord(macro) || typeof macro.id !== "string" || typeof macro.name !== "string" || !macro.name.trim() || !Array.isArray(macro.steps)) {
        throw new Error(`Profile ${index + 1}, macro ${macroIndex + 1} is invalid.`);
      }
      const steps = macro.steps.map((step, stepIndex): MacroStep => {
        if (!isRecord(step) || typeof step.id !== "string" || typeof step.key !== "string" || !step.key.trim() ||
            !Number.isInteger(step.delayMs) || Number(step.delayMs) < 0 || Number(step.delayMs) > 5000) {
          throw new Error(`Profile ${index + 1}, macro ${macroIndex + 1}, step ${stepIndex + 1} is invalid.`);
        }
        return { id: step.id, key: step.key, delayMs: Number(step.delayMs) };
      });
      return { id: macro.id, name: macro.name.trim(), steps };
    });
    return {
      id: candidate.id,
      name: candidate.name.trim(),
      createdAt: candidate.createdAt,
      lighting: {
        effect: lighting.effect as LightingEffect,
        color: lighting.color,
        brightness: Number(lighting.brightness),
        speed: Number(lighting.speed),
      },
      keyMap,
      macros,
    };
  });

  const ids = new Set(profiles.map((profile) => profile.id));
  if (ids.size !== profiles.length) throw new Error("Profile ids must be unique.");
  if (typeof value.activeProfileId !== "string" || !ids.has(value.activeProfileId)) {
    throw new Error("The active profile does not exist in this file.");
  }
  return { format: "havit-control-center-profile", version: 1, profiles, activeProfileId: value.activeProfileId };
}

export function readStoredDocument(storage: Storage = localStorage): ProfileDocument {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultDocument();
  try {
    return validateProfileDocument(JSON.parse(raw) as unknown);
  } catch {
    return createDefaultDocument();
  }
}

export function writeStoredDocument(document: ProfileDocument, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(validateProfileDocument(document)));
}
