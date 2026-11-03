import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const store = path.join(root, "node_modules", ".pnpm");
const found = new Map();

async function addPackage(packageDirectory) {
  const manifestPath = path.join(packageDirectory, "package.json");
  try {
    await access(manifestPath);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (typeof manifest.name !== "string" || typeof manifest.version !== "string") return;
    const license = typeof manifest.license === "string"
      ? manifest.license
      : Array.isArray(manifest.licenses)
        ? manifest.licenses.map((item) => item?.type).filter(Boolean).join(" OR ")
        : "Not declared in package metadata";
    found.set(`${manifest.name}@${manifest.version}`, { name: manifest.name, version: manifest.version, license });
  } catch {
    // Ignore package links that are not readable package manifests.
  }
}

async function addModuleEntries(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.name.startsWith("@")) {
      let scopedEntries;
      try { scopedEntries = await readdir(entryPath, { withFileTypes: true }); } catch { continue; }
      for (const scoped of scopedEntries) await addPackage(path.join(entryPath, scoped.name));
    } else {
      await addPackage(entryPath);
    }
  }
}

let storeEntries;
try {
  storeEntries = await readdir(store, { withFileTypes: true });
} catch {
  throw new Error("Dependency store is missing. Install from pnpm-lock.yaml before generating notices.");
}

for (const entry of storeEntries) {
  if (entry.isDirectory()) await addModuleEntries(path.join(store, entry.name, "node_modules"));
}

const packages = [...found.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const unresolved = packages.filter((item) => item.license === "Not declared in package metadata");
const rows = packages.map((item) => `| \`${item.name}\` | ${item.version} | ${item.license.replaceAll("|", "\\|")} |`).join("\n");
const report = `# Dependency license inventory\n\nGenerated from the installed pnpm dependency store. Regenerate after changing pnpm-lock.yaml with node scripts/generate-license-report.mjs. This inventory reflects package metadata; it is not legal advice and does not replace license text or notices required by each package. Review every entry and the release bundle before distribution.\n\nPackages found: ${packages.length}. Entries without declared license metadata: ${unresolved.length}.\n\n| Package | Version | Declared license |\n| --- | --- | --- |\n${rows}\n\n## Review required\n\n${unresolved.length ? unresolved.map((item) => `- \`${item.name}@${item.version}\`: inspect upstream license files and decide whether it may be redistributed.`).join("\n") : "Every discovered package declares license metadata. A maintainer must still review upstream license files and packaged notices before release."}\n`;

await writeFile(path.join(root, "THIRD_PARTY_LICENSES.md"), report, "utf8");
console.log(`Wrote THIRD_PARTY_LICENSES.md for ${packages.length} package versions; ${unresolved.length} need license investigation.`);
