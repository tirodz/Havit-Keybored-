import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode, ChangeEvent } from "react";
import { Icon, type IconName } from "./components/Icon";
import { KeyboardPreview } from "./components/KeyboardPreview";
import { allKeyCodes, keyChoices } from "./domain/keyboard";
import { formatHexColorDraft, isHexColorDraft, parseHexColor } from "./domain/colors";
import {
  createDefaultDocument,
  createProfile,
  readStoredDocument,
  validateProfileDocument,
  writeStoredDocument,
} from "./domain/profiles";
import type { LightingEffect, Macro, Profile, ProfileDocument } from "./domain/profiles";
import { deviceProvider } from "./services/device";
import type { DeviceOutcome, DeviceSnapshot } from "./services/device";
import { havitHidConnection } from "./services/havit-hid";
import type { PhysicalDeviceSnapshot } from "./services/havit-hid";

type PageId = "Overview" | "Lighting" | "Key Studio" | "Macro Studio" | "Profiles" | "Diagnostics" | "Settings";
type NavItem = { id: PageId; icon: IconName; group: "Device" | "Manage" };
type ActivityItem = { id: string; text: string; ok: boolean; time: string };

const navItems: NavItem[] = [
  { id: "Overview", icon: "grid", group: "Device" },
  { id: "Lighting", icon: "spark", group: "Device" },
  { id: "Key Studio", icon: "keyboard", group: "Device" },
  { id: "Macro Studio", icon: "command", group: "Manage" },
  { id: "Profiles", icon: "layers", group: "Manage" },
  { id: "Diagnostics", icon: "activity", group: "Manage" },
  { id: "Settings", icon: "settings", group: "Manage" },
];

const effectDescriptions: Record<LightingEffect, string> = {
  Static: "One color across the preview.",
  Breathing: "A slow brightness pulse in the preview.",
  Wave: "A flowing color variation across the preview.",
  Reactive: "A varied accent pattern across preview keys.",
};

function timeLabel(value = new Date()) {
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function App() {
  const [document, setDocument] = useState<ProfileDocument>(() => readStoredDocument());
  const [page, setPage] = useState<PageId>("Overview");
  const [device, setDevice] = useState<DeviceSnapshot>(() => deviceProvider.snapshot());
  const [physicalDevice, setPhysicalDevice] = useState<PhysicalDeviceSnapshot>(() => havitHidConnection.snapshot());
  const [physicalDeviceBusy, setPhysicalDeviceBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: "welcome", text: "Offline simulator session ready", ok: true, time: timeLabel() },
  ]);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("havit-control-center.reduce-motion") === "true");
  const importRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const activeProfile = useMemo(
    () => document.profiles.find((profile) => profile.id === document.activeProfileId) ?? document.profiles[0],
    [document],
  );

  useEffect(() => {
    try { writeStoredDocument(document); }
    catch { showNotice("Could not save profile data in local app storage.", true); }
  }, [document]);

  useEffect(() => {
    window.document.documentElement.dataset.reduceMotion = String(reducedMotion);
    localStorage.setItem("havit-control-center.reduce-motion", String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => havitHidConnection.subscribe(setPhysicalDevice), []);

  function showNotice(text: string, error = false) {
    setNotice({ text, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setNotice(null), 3600);
  }

  function pushActivity(text: string, ok: boolean) {
    setActivity((current) => [{ id: crypto.randomUUID(), text, ok, time: timeLabel() }, ...current].slice(0, 12));
  }

  function runOutcome(outcome: DeviceOutcome) {
    setDevice(deviceProvider.snapshot());
    pushActivity(outcome.message, outcome.ok);
    showNotice(outcome.message, !outcome.ok);
  }

  function updateActive(updater: (profile: Profile) => Profile) {
    if (!activeProfile) return;
    setDocument((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => profile.id === current.activeProfileId ? updater(profile) : profile),
    }));
  }

  function updateLighting<K extends keyof Profile["lighting"]>(key: K, value: Profile["lighting"][K]) {
    updateActive((profile) => ({ ...profile, lighting: { ...profile.lighting, [key]: value } }));
  }

  async function applyLighting() {
    if (!activeProfile) return;
    runOutcome(await deviceProvider.applyLighting(activeProfile.lighting));
  }

  async function toggleConnection() {
    const outcome = device.status === "connected" ? await deviceProvider.disconnect() : await deviceProvider.connect();
    runOutcome(outcome);
  }

  async function togglePhysicalConnection() {
    setPhysicalDeviceBusy(true);
    try {
      const snapshot = physicalDevice.status === "connected"
        ? await havitHidConnection.disconnect()
        : await havitHidConnection.connect();
      showNotice(snapshot.message, snapshot.status === "error" || snapshot.status === "unavailable");
    } finally {
      setPhysicalDeviceBusy(false);
    }
  }

  function addProfile(name: string) {
    try {
      const profile = createProfile(name);
      setDocument((current) => ({ ...current, profiles: [...current.profiles, profile], activeProfileId: profile.id }));
      showNotice(`Profile “${profile.name}” created.`);
      setPage("Profiles");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not create profile.", true);
    }
  }

  function deleteProfile(id: string) {
    if (document.profiles.length <= 1) {
      showNotice("Keep at least one profile.", true);
      return;
    }
    const next = document.profiles.filter((profile) => profile.id !== id);
    setDocument((current) => ({
      ...current,
      profiles: next,
      activeProfileId: current.activeProfileId === id ? next[0].id : current.activeProfileId,
    }));
    showNotice("Profile removed from this device.");
  }

  function addMacro(name: string, rawSteps: string) {
    if (!name.trim()) { showNotice("Give the macro a name.", true); return; }
    const keys = rawSteps.split(/[\s,]+/).map((key) => key.trim()).filter(Boolean);
    if (keys.length === 0) { showNotice("Add at least one key to the sequence.", true); return; }
    const macro: Macro = {
      id: crypto.randomUUID(),
      name: name.trim(),
      steps: keys.map((key, index) => ({ id: `${index}-${key}`, key: key.toUpperCase(), delayMs: index === 0 ? 0 : 80 })),
    };
    updateActive((profile) => ({ ...profile, macros: [...profile.macros, macro] }));
    showNotice(`Macro “${macro.name}” saved locally.`);
  }

  function removeMacro(id: string) {
    updateActive((profile) => ({ ...profile, macros: profile.macros.filter((macro) => macro.id !== id) }));
    showNotice("Macro removed.");
  }

  async function assignKey(value: string) {
    if (!selectedKey) return;
    updateActive((profile) => {
      const keyMap = { ...profile.keyMap };
      if (value === "Original") delete keyMap[selectedKey];
      else keyMap[selectedKey] = value;
      return { ...profile, keyMap };
    });
    if (value === "Original") {
      showNotice("Default assignment restored in this profile.");
      return;
    }
    runOutcome(await deviceProvider.applyKeyMap(selectedKey, value));
  }

  function exportProfiles() {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "havit-control-center-profiles.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showNotice("Profile export downloaded.");
  }

  async function importProfiles(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Profile files must be under 1 MB.");
      const parsed = validateProfileDocument(JSON.parse(await file.text()) as unknown);
      setDocument(parsed);
      showNotice(`${parsed.profiles.length} profile${parsed.profiles.length === 1 ? "" : "s"} imported.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not read profile file.", true);
    } finally {
      event.target.value = "";
    }
  }

  function resetData() {
    if (!window.confirm("Reset all local profiles and simulator settings? This cannot be undone.")) return;
    const initial = createDefaultDocument();
    setDocument(initial);
    writeStoredDocument(initial);
    setPage("Overview");
    setSelectedKey(null);
    showNotice("Local data reset.");
  }

  if (!activeProfile) return <main className="fatal-state">Profile data could not be loaded. Reset local data from Settings.</main>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="product-lockup">
          <div className="brand-mark">H</div>
          <div><div className="product-name">HAVIT <span>CONTROL</span></div><div className="product-subtitle">COMMUNITY EDITION</div></div>
        </div>

        <div className="device-card">
          <div className="device-card-top">
            <div className="device-avatar"><Icon name="keyboard" size={21} /></div>
            <button className="icon-button device-more" aria-label="Device options" title="Device options" onClick={() => setPage("Diagnostics")}><Icon name="chevron" size={16} /></button>
          </div>
          <div className="device-name">HAVIT KB874L</div>
          <div className="device-meta"><span className={`status-led${device.status === "connected" ? " status-led--on" : ""}`} /> {device.status === "connected" ? "Simulator connected" : "Simulator offline"}</div>
          <div className="device-card-foot"><span className="sim-tag">SIM</span><span>Physical support unverified</span></div>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {(["Device", "Manage"] as const).map((group) => (
            <div className="nav-group" key={group}>
              <div className="nav-label">{group}</div>
              {navItems.filter((item) => item.group === group).map((item) => (
                <button className={`nav-item${page === item.id ? " nav-item--active" : ""}`} key={item.id} onClick={() => setPage(item.id)} aria-current={page === item.id ? "page" : undefined}>
                  <Icon name={item.icon} size={18} /><span>{item.id}</span>{page === item.id && <span className="nav-active-mark" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="community-note"><span className="community-spark">✳</span><div><strong>Independent project</strong><span>Not affiliated with HAVIT</span></div></div>
          <button className="sidebar-profile" onClick={() => setPage("Profiles")}>
            <div className="profile-avatar">{activeProfile.name.slice(0, 1).toUpperCase()}</div>
            <div className="sidebar-profile-copy"><span>ACTIVE PROFILE</span><strong>{activeProfile.name}</strong></div>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Control Center</span><span className="crumb-slash">/</span><strong>{page}</strong></div>
          <div className="topbar-actions">
            <div className={`connection-pill${device.status === "connected" ? " connection-pill--connected" : ""}`}><span className="status-led" />{device.status === "connected" ? "Simulator active" : "Disconnected"}</div>
            <button className="outline-button connection-action" onClick={toggleConnection}><Icon name="plug" size={16} />{device.status === "connected" ? "Disconnect" : "Reconnect"}</button>
            <div className="topbar-divider" />
            <button className="icon-button top-icon" aria-label="Open diagnostics" title="Open diagnostics" onClick={() => setPage("Diagnostics")}><Icon name="activity" size={18} /></button>
            <button className="profile-chip" onClick={() => setPage("Profiles")}><span className="profile-avatar profile-avatar--small">{activeProfile.name.slice(0, 1).toUpperCase()}</span><span>{activeProfile.name}</span><Icon name="chevron" size={14} /></button>
          </div>
        </header>

        <div className="page-scroll">
          {page === "Overview" && <OverviewPage profile={activeProfile} device={device} activity={activity} onNavigate={setPage} onSelectKey={setSelectedKey} selectedKey={selectedKey} />}
          {page === "Lighting" && <LightingPage profile={activeProfile} onChange={updateLighting} onApply={applyLighting} onSelectKey={setSelectedKey} selectedKey={selectedKey} />}
          {page === "Key Studio" && <KeyStudioPage profile={activeProfile} selectedKey={selectedKey} onSelectKey={setSelectedKey} onAssign={assignKey} />}
          {page === "Macro Studio" && <MacroPage macros={activeProfile.macros} onAdd={addMacro} onRemove={removeMacro} />}
          {page === "Profiles" && <ProfilesPage document={document} onSelect={(id) => setDocument((current) => ({ ...current, activeProfileId: id }))} onAdd={addProfile} onDelete={deleteProfile} onExport={exportProfiles} onImport={() => importRef.current?.click()} />}
          {page === "Diagnostics" && <DiagnosticsPage device={device} physicalDevice={physicalDevice} physicalDeviceBusy={physicalDeviceBusy} activity={activity} onConnect={toggleConnection} onConnectPhysical={togglePhysicalConnection} onFail={() => { deviceProvider.failNextOperation(); showNotice("The next simulator operation will fail."); }} />}
          {page === "Settings" && <SettingsPage reducedMotion={reducedMotion} onReducedMotion={setReducedMotion} onExport={exportProfiles} onImport={() => importRef.current?.click()} onReset={resetData} />}
        </div>
      </main>

      <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importProfiles} />
      {notice && <div className={`toast${notice.error ? " toast--error" : ""}`} role="status"><span className="toast-icon"><Icon name={notice.error ? "alert" : "check"} size={17} /></span><span>{notice.text}</span><button className="icon-button toast-close" aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="x" size={15} /></button></div>}
      <footer className="app-footnote"><span>SIMULATOR MODE</span><span>·</span><span>Changes are local previews and do not control physical hardware.</span></footer>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

function OverviewPage({ profile, device, activity, onNavigate, onSelectKey, selectedKey }: { profile: Profile; device: DeviceSnapshot; activity: ActivityItem[]; onNavigate: (page: PageId) => void; onSelectKey: (key: string) => void; selectedKey: string | null }) {
  const assigned = Object.keys(profile.keyMap).length;
  return <>
    <PageHeading eyebrow="DEVICE OVERVIEW" title="Make it yours." description="Your keyboard workspace, running safely in offline simulation." action={<button className="primary-button" onClick={() => onNavigate("Lighting")}><Icon name="spark" size={17} />Open lighting studio</button>} />
    <div className="stats-row">
      <div className="stat-card"><div className="stat-icon stat-icon--blue"><Icon name="keyboard" /></div><div><span>DEVICE</span><strong>KB874L</strong><small>Physical support unverified</small></div><div className="stat-tail"><span className={`status-led${device.status === "connected" ? " status-led--on" : ""}`} />SIM</div></div>
      <div className="stat-card"><div className="stat-icon stat-icon--violet"><Icon name="layers" /></div><div><span>ACTIVE PROFILE</span><strong>{profile.name}</strong><small>{profile.macros.length} saved macros</small></div><button className="stat-link" onClick={() => onNavigate("Profiles")} aria-label="Manage profiles"><Icon name="arrow" /></button></div>
      <div className="stat-card"><div className="stat-icon stat-icon--mint"><Icon name="keyboard" /></div><div><span>KEY ASSIGNMENTS</span><strong>{assigned}<em> / {allKeyCodes.length}</em></strong><small>Profile-local simulation</small></div><button className="stat-link" onClick={() => onNavigate("Key Studio")} aria-label="Open key studio"><Icon name="arrow" /></button></div>
    </div>

    <div className="overview-grid">
      <section className="panel keyboard-panel">
        <div className="panel-heading"><div><div className="section-kicker">LIVE PREVIEW</div><h2>Keyboard visualizer</h2></div><button className="text-button" onClick={() => onNavigate("Key Studio")}>Edit keys <Icon name="arrow" size={15} /></button></div>
        <div className="layout-warning"><Icon name="alert" size={15} /><span>Generic 67-key layout shown. Manufacturer lists 67 keys; exact geometry and legends still need verification.</span></div>
        <KeyboardPreview profile={profile} selectedKey={selectedKey} onSelectKey={onSelectKey} />
        <div className="keyboard-panel-foot"><span><span className="legend-dot legend-dot--color" />Preview lighting</span><span><span className="legend-dot legend-dot--mapped" />Assigned key</span><span>Click any key to inspect it</span></div>
      </section>
      <aside className="overview-side">
        <section className="panel profile-summary">
          <div className="panel-heading"><div><div className="section-kicker">CURRENT SETUP</div><h2>Profile snapshot</h2></div><span className="mini-badge">LOCAL</span></div>
          <div className="profile-summary-main"><div className="color-orb" style={{ background: profile.lighting.color }} /><div><strong>{profile.lighting.effect}</strong><span>{profile.lighting.color.toUpperCase()} · {profile.lighting.brightness}% brightness</span></div></div>
          <div className="summary-meter"><div className="summary-meter-label"><span>Brightness</span><strong>{profile.lighting.brightness}%</strong></div><div className="meter-track"><span style={{ width: `${profile.lighting.brightness}%`, background: profile.lighting.color }} /></div></div>
          <div className="summary-actions"><button className="outline-button outline-button--wide" onClick={() => onNavigate("Lighting")}><Icon name="spark" size={16} />Adjust preview</button><button className="outline-button outline-button--square" aria-label="Edit profile" title="Edit profile" onClick={() => onNavigate("Profiles")}><Icon name="layers" size={16} /></button></div>
        </section>
        <section className="panel recent-panel">
          <div className="panel-heading"><div><div className="section-kicker">LOCAL ACTIVITY</div><h2>Simulator activity</h2></div><button className="text-button" onClick={() => onNavigate("Diagnostics")}>View all <Icon name="arrow" size={15} /></button></div>
          <div className="activity-list">{activity.slice(0, 4).map((entry) => <div className="activity-item" key={entry.id}><span className={`activity-indicator${entry.ok ? "" : " activity-indicator--error"}`}><Icon name={entry.ok ? "check" : "alert"} size={13} /></span><div><strong>{entry.text}</strong><span>{entry.time} · simulator</span></div></div>)}</div>
          <div className="device-status-card"><div className="device-status-icon"><Icon name="plug" size={17} /></div><div><strong>{device.status === "connected" ? "Simulator is ready" : "Simulator disconnected"}</strong><span>{device.lastAction}</span></div><span className={`status-led${device.status === "connected" ? " status-led--on" : ""}`} /></div>
        </section>
      </aside>
    </div>
    <div className="independent-banner"><div className="independent-icon">i</div><div><strong>Independent community project</strong><span>Not affiliated with or endorsed by HAVIT. Physical keyboard support is still being investigated.</span></div><button className="text-button" onClick={() => onNavigate("Diagnostics")}>Compatibility details <Icon name="arrow" size={15} /></button></div>
  </>;
}

function LightingPage({ profile, onChange, onApply, onSelectKey, selectedKey }: { profile: Profile; onChange: <K extends keyof Profile["lighting"]>(key: K, value: Profile["lighting"][K]) => void; onApply: () => void; onSelectKey: (key: string) => void; selectedKey: string | null }) {
  const effects: LightingEffect[] = ["Static", "Breathing", "Wave", "Reactive"];
  const [hexDraft, setHexDraft] = useState(profile.lighting.color.toUpperCase());

  useEffect(() => setHexDraft(profile.lighting.color.toUpperCase()), [profile.lighting.color]);

  function updateHexDraft(value: string) {
    if (!isHexColorDraft(value)) return;
    setHexDraft(formatHexColorDraft(value));
    const color = parseHexColor(value);
    if (color) onChange("color", color);
  }

  return <>
    <PageHeading eyebrow="DEVICE · SIMULATED" title="Lighting studio" description="Explore preview effects and color. Every change in this build stays in the offline simulator." action={<span className="sim-tag sim-tag--large">SIMULATOR ONLY</span>} />
    <div className="lighting-workspace">
      <section className="panel lighting-preview-panel"><div className="panel-heading"><div><div className="section-kicker">PREVIEW CANVAS</div><h2>Your keyboard, in color</h2></div><span className="mini-badge"><span className="status-led status-led--on" /> LIVE</span></div><KeyboardPreview profile={profile} selectedKey={selectedKey} onSelectKey={onSelectKey} /><div className="preview-caption"><span>Preview updates as you edit</span><span>Profile: <strong>{profile.name}</strong></span></div></section>
      <aside className="panel lighting-controls"><div className="section-kicker">PREVIEW CONTROLS</div><h2>Lighting</h2><p className="control-subtitle">These effect models are illustrative. Hardware support is unknown.</p>
        <span className="field-label">Effect model</span><div className="effect-grid" role="group" aria-label="Effect model">{effects.map((effect) => <button key={effect} className={`effect-card${profile.lighting.effect === effect ? " effect-card--active" : ""}`} onClick={() => onChange("effect", effect)} aria-pressed={profile.lighting.effect === effect}><span className={`effect-glyph effect-glyph--${effect.toLowerCase()}`}><i /><i /><i /></span><strong>{effect}</strong><span>{effect === "Static" ? "Single color" : effect === "Breathing" ? "Soft pulse" : effect === "Wave" ? "Flowing hue" : "Accent pattern"}</span></button>)}</div>
        <div className="control-divider" />
        <div className="field-row"><label className="field-label" htmlFor="preview-color">Preview color</label><span className="color-value">{profile.lighting.color.toUpperCase()}</span></div><div className="color-control"><input id="preview-color" type="color" value={profile.lighting.color} onChange={(event) => onChange("color", event.target.value)} aria-label="Choose preview color"/><div><strong>Accent color</strong><span>Used by this local preview</span></div><input className="color-hex" value={hexDraft} onChange={(event) => updateHexDraft(event.target.value)} onBlur={() => setHexDraft(profile.lighting.color.toUpperCase())} aria-label="Hex color" aria-describedby="hex-color-help" placeholder="#63A6FF" maxLength={7}/><span id="hex-color-help" className="visually-hidden">Enter a six-digit hexadecimal color, with or without the number sign.</span></div>
        <RangeControl id="brightness" label="Brightness" value={profile.lighting.brightness} minLabel="Dim" maxLabel="Bright" onChange={(value) => onChange("brightness", value)} />
        <RangeControl id="speed" label="Animation speed" value={profile.lighting.speed} minLabel="Slow" maxLabel="Fast" onChange={(value) => onChange("speed", value)} disabled={profile.lighting.effect === "Static"} />
        <div className="effect-description"><Icon name="spark" size={16} /><span>{effectDescriptions[profile.lighting.effect]}</span></div>
        <div className="lighting-action-row"><button className="outline-button" onClick={() => { onChange("effect", "Static"); onChange("color", "#63a6ff"); onChange("brightness", 65); onChange("speed", 45); }}>Reset preview</button><button className="primary-button" onClick={onApply}><Icon name="check" size={16} />Apply to simulator</button></div>
        <div className="sim-notice"><span className="sim-notice-mark">SIM</span><span>“Apply” records a simulated action only. It sends no HID report.</span></div>
      </aside>
    </div>
  </>;
}

function RangeControl({ id, label, value, minLabel, maxLabel, onChange, disabled = false }: { id: string; label: string; value: number; minLabel: string; maxLabel: string; onChange: (value: number) => void; disabled?: boolean }) {
  return <div className={`range-control${disabled ? " range-control--disabled" : ""}`}><div className="field-row"><label className="field-label" htmlFor={id}>{label}</label><output htmlFor={id}>{value}%</output></div><input id={id} type="range" min="0" max="100" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /><div className="range-labels"><span>{minLabel}</span><span>{maxLabel}</span></div></div>;
}

function KeyStudioPage({ profile, selectedKey, onSelectKey, onAssign }: { profile: Profile; selectedKey: string | null; onSelectKey: (key: string) => void; onAssign: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const matching = allKeyCodes.filter((key) => key.toLowerCase().includes(search.toLowerCase()) || (profile.keyMap[key] ?? "").toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = selectedKey ? selectedKey.replace(/^(Key|Digit)/, "") : "No key selected";
  return <>
    <PageHeading eyebrow="DEVICE · SIMULATED" title="Key studio" description="Select a key and try a profile-local assignment. This does not remap the physical keyboard." action={<span className="sim-tag sim-tag--large">PROFILE-LOCAL</span>} />
    <section className="panel key-editor-panel"><div className="panel-heading"><div><div className="section-kicker">INTERACTIVE LAYOUT</div><h2>Choose a key to edit</h2></div><div className="key-count">{Object.keys(profile.keyMap).length} assignments in this profile</div></div><div className="layout-warning"><Icon name="alert" size={15} /><span>Generic 67-key ANSI preview. Key legends and physical positions are not verified.</span></div><KeyboardPreview profile={profile} selectedKey={selectedKey} onSelectKey={onSelectKey} />
      <div className="key-editor-bottom"><div className="selected-key-card"><span className="selected-key-cap">{selectedLabel === "No key selected" ? "···" : selectedLabel}</span><div><span>SELECTED KEY</span><strong>{selectedLabel}</strong><small>{selectedKey && profile.keyMap[selectedKey] ? `Current simulated mapping: ${profile.keyMap[selectedKey]}` : "Current simulated mapping: default"}</small></div></div><div className="assign-control"><label className="field-label" htmlFor="key-assignment">Simulated assignment</label><div className="assignment-row"><select id="key-assignment" disabled={!selectedKey} value={selectedKey ? profile.keyMap[selectedKey] ?? "Original" : "Original"} onChange={(event) => onAssign(event.target.value)}><option value="Original">Default assignment</option>{keyChoices.map((choice) => <option value={choice} key={choice}>{choice}</option>)}</select><span className="sim-tag">LOCAL</span></div></div></div>
    </section>
    <section className="panel assignment-list-panel"><div className="panel-heading"><div><div className="section-kicker">PROFILE MAP</div><h2>Custom assignments</h2></div><div className="search-box"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter keys" aria-label="Filter keys" /></div></div>{Object.keys(profile.keyMap).length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="keyboard" size={21} /></div><strong>No custom assignments yet</strong><span>Select any key above to add a simulated assignment.</span></div> : <div className="assignment-table"><div className="assignment-table-head"><span>PHYSICAL KEY</span><span>PROFILE ASSIGNMENT</span><span>MODE</span><span /></div>{matching.filter((key) => profile.keyMap[key]).map((key) => <div className="assignment-table-row" key={key}><strong>{key.replace(/^(Key|Digit)/, "")}</strong><span>{profile.keyMap[key]}</span><span className="sim-tag">SIM</span><button className="text-button" onClick={() => { onSelectKey(key); onAssign("Original"); }}><Icon name="trash" size={15} />Remove</button></div>)}</div>}</section>
  </>;
}

function MacroPage({ macros, onAdd, onRemove }: { macros: Macro[]; onAdd: (name: string, keys: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState("");
  const [keys, setKeys] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); onAdd(name, keys); setName(""); setKeys(""); }
  return <>
    <PageHeading eyebrow="PROFILE TOOLS · LOCAL" title="Macro studio" description="Build and store key sequences in the current local profile. Playback and device-side macro support are not implemented." action={<span className="mini-badge">{macros.length} SAVED</span>} />
    <div className="macro-grid"><section className="panel macro-builder"><div className="panel-heading"><div><div className="section-kicker">SEQUENCE BUILDER</div><h2>Create a macro</h2></div><span className="sim-tag">LOCAL ONLY</span></div><form onSubmit={submit} className="macro-form"><label className="field-label" htmlFor="macro-name">Macro name</label><input id="macro-name" className="text-input" placeholder="e.g. Quick message" value={name} onChange={(event) => setName(event.target.value)} maxLength={48} /><label className="field-label" htmlFor="macro-sequence">Key sequence</label><textarea id="macro-sequence" className="text-input macro-textarea" placeholder="Type keys separated by spaces: H E L L O" value={keys} onChange={(event) => setKeys(event.target.value)} maxLength={256} /><div className="field-hint">Use key names separated by spaces or commas. This stores a sequence model only.</div><button className="primary-button" type="submit"><Icon name="plus" size={17} />Save to profile</button></form></section>
      <section className="panel macro-list"><div className="panel-heading"><div><div className="section-kicker">CURRENT PROFILE</div><h2>Saved sequences</h2></div><span className="key-count">{macros.length} total</span></div>{macros.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="command" size={21} /></div><strong>No macros saved</strong><span>Create a local sequence to see it here.</span></div> : <div className="macro-cards">{macros.map((macro) => <article className="macro-card" key={macro.id}><div className="macro-card-head"><div className="macro-symbol"><Icon name="command" size={17} /></div><div><strong>{macro.name}</strong><span>{macro.steps.length} keys · profile-local</span></div><button className="icon-button danger-icon" onClick={() => onRemove(macro.id)} aria-label={`Remove ${macro.name}`}><Icon name="trash" size={16} /></button></div><div className="macro-steps">{macro.steps.map((step) => <span className="macro-step" key={step.id}>{step.key}</span>)}</div></article>)}</div>}</section></div>
    <div className="notice-banner"><Icon name="alert" size={17} /><span>Macros are saved as local profile data. The app does not inject keystrokes or claim hardware playback support.</span></div>
  </>;
}

function ProfilesPage({ document, onSelect, onAdd, onDelete, onExport, onImport }: { document: ProfileDocument; onSelect: (id: string) => void; onAdd: (name: string) => void; onDelete: (id: string) => void; onExport: () => void; onImport: () => void }) {
  const [name, setName] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); onAdd(name); setName(""); }
  return <>
    <PageHeading eyebrow="LOCAL CONFIGURATION" title="Profiles" description="Switch between local configuration sets and export or import them as validated JSON." action={<div className="profile-actions"><button className="outline-button" onClick={onImport}><Icon name="upload" size={16} />Import</button><button className="outline-button" onClick={onExport}><Icon name="download" size={16} />Export all</button></div>} />
    <section className="panel profile-create-panel"><form className="profile-create-form" onSubmit={submit}><div className="create-profile-icon"><Icon name="plus" size={19} /></div><div className="create-profile-copy"><strong>Create a profile</strong><span>Start with a clean local configuration.</span></div><input className="text-input" placeholder="Profile name" aria-label="New profile name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /><button className="primary-button" type="submit">Create profile</button></form></section>
    <div className="profile-grid">{document.profiles.map((profile) => {const active = profile.id === document.activeProfileId; return <article key={profile.id} className={`panel profile-card${active ? " profile-card--active" : ""}`}><div className="profile-card-top"><div className="profile-card-avatar" style={{ "--profile-color": profile.lighting.color } as CSSProperties}>{profile.name.slice(0, 1).toUpperCase()}</div><div className="profile-card-actions">{active && <span className="active-badge"><Icon name="check" size={13} />ACTIVE</span>}<button className="icon-button danger-icon" onClick={() => onDelete(profile.id)} aria-label={`Delete ${profile.name}`} title="Delete profile"><Icon name="trash" size={16} /></button></div></div><h2>{profile.name}</h2><div className="profile-date">Created {new Date(profile.createdAt).toLocaleDateString()}</div><div className="profile-specs"><div><span className="color-orb color-orb--small" style={{ background: profile.lighting.color }} /><span>{profile.lighting.effect}</span></div><div><Icon name="keyboard" size={15} /><span>{Object.keys(profile.keyMap).length} key maps</span></div><div><Icon name="command" size={15} /><span>{profile.macros.length} macros</span></div></div><button className={active ? "outline-button outline-button--wide profile-select" : "primary-button profile-select"} onClick={() => onSelect(profile.id)} disabled={active}>{active ? "Current profile" : "Use this profile"}</button></article>; })}</div>
    <div className="storage-footnote"><Icon name="layers" size={16} /><span>Stored locally in this app on this computer. These settings are not written to the keyboard.</span></div>
  </>;
}

function DiagnosticsPage({ device, physicalDevice, physicalDeviceBusy, activity, onConnect, onConnectPhysical, onFail }: { device: DeviceSnapshot; physicalDevice: PhysicalDeviceSnapshot; physicalDeviceBusy: boolean; activity: ActivityItem[]; onConnect: () => void; onConnectPhysical: () => void; onFail: () => void }) {
  return <>
    <PageHeading eyebrow="STATUS · DEVICE" title="Diagnostics" description="Inspect the offline simulator and open a matching physical HID interface. Lighting and key reports remain disabled." action={<button className="outline-button" onClick={onConnect}><Icon name="refresh" size={16} />{device.status === "connected" ? "Disconnect simulator" : "Reconnect simulator"}</button>} />
    <section className="panel physical-device-panel"><div className="physical-device-heading"><div><div className="section-kicker">PHYSICAL DEVICE · HID</div><h2>KB874L connection</h2><p>{physicalDevice.message}</p></div><span className={`physical-device-state physical-device-state--${physicalDevice.status}`}><span className="status-led" />{physicalDevice.status.toUpperCase()}</span></div><div className="physical-device-details"><div><span>Selected interface</span><strong>{physicalDevice.name}</strong></div><div><span>USB identity filter</span><strong>05AC:024F</strong></div><div><span>Device commands</span><strong>Disabled · no reports sent</strong></div></div><div className="physical-device-collections"><span>HID descriptor collections</span>{physicalDevice.collections.length ? <ul>{physicalDevice.collections.map((collection, index) => <li key={`${collection}-${index}`}>{collection}</li>)}</ul> : <p>{physicalDevice.status === "connected" ? "No collection metadata was exposed by this interface." : "Connect to inspect usage pages and report IDs exposed by WebHID."}</p>}</div><div className="physical-device-action"><button className="outline-button" onClick={onConnectPhysical} disabled={physicalDeviceBusy || physicalDevice.status === "unavailable"}>{physicalDeviceBusy ? "Opening HID interface…" : physicalDevice.status === "connected" ? "Close physical connection" : "Connect physical keyboard"}</button><span className="field-hint">Connection opens the selected HID interface only. It does not change lighting or keys.</span></div></section>
    <div className="diagnostics-grid"><section className="panel diagnostic-summary"><div className="section-kicker">DEVICE SESSION</div><h2>Connection details</h2><div className="diagnostic-row"><span>Selected backend</span><strong><span className="sim-tag">SIMULATOR</span></strong></div><div className="diagnostic-row"><span>Display name</span><strong>{device.name}</strong></div><div className="diagnostic-row"><span>Session state</span><strong className="diagnostic-state"><span className={`status-led${device.status === "connected" ? " status-led--on" : ""}`} />{device.status}</strong></div><div className="diagnostic-row"><span>Last operation</span><strong>{device.lastAction}</strong></div><div className="diagnostic-row"><span>Hardware protocol</span><strong className="text-muted">Unknown · writes disabled</strong></div><div className="diag-actions"><button className="outline-button" onClick={onFail}><Icon name="alert" size={16} />Fail next operation</button><span className="field-hint">Exercises simulator error feedback.</span></div></section>
      <section className="panel diagnostic-activity"><div className="panel-heading"><div><div className="section-kicker">LOCAL EVENT LOG</div><h2>Recent operations</h2></div><span className="mini-badge">{activity.length} EVENTS</span></div><div className="log-table"><div className="log-head"><span>RESULT</span><span>OPERATION</span><span>TIME</span></div>{activity.map((entry) => <div className="log-row" key={entry.id}><span className={`log-result${entry.ok ? " log-result--ok" : " log-result--error"}`}><Icon name={entry.ok ? "check" : "alert"} size={13} />{entry.ok ? "SIMULATED" : "FAILED"}</span><strong>{entry.text}</strong><span>{entry.time}</span></div>)}</div></section></div>
    <section className="panel compatibility-panel"><div className="compat-icon"><Icon name="alert" size={19} /></div><div><div className="section-kicker">HARDWARE COMPATIBILITY</div><h2>Physical HID access is not yet verified</h2><p>The app has a connection-only path for the reported keyboard identity, but it has not been verified at runtime. The report descriptor and lighting command meanings are still unknown, so lighting and key writes remain disabled.</p></div><div className="compat-state"><span className="status-led" />PARTIAL</div></section>
  </>;
}

function SettingsPage({ reducedMotion, onReducedMotion, onExport, onImport, onReset }: { reducedMotion: boolean; onReducedMotion: (value: boolean) => void; onExport: () => void; onImport: () => void; onReset: () => void }) {
  return <>
    <PageHeading eyebrow="APPLICATION" title="Settings" description="Configure local app behavior and manage your profile data." />
    <div className="settings-list"><section className="panel settings-card"><div className="settings-card-icon"><Icon name="sun" /></div><div className="settings-card-copy"><strong>Reduced motion</strong><span>Limit decorative transitions and animated previews.</span></div><button className={`toggle${reducedMotion ? " toggle--on" : ""}`} role="switch" aria-checked={reducedMotion} onClick={() => onReducedMotion(!reducedMotion)}><span /></button></section>
      <section className="panel settings-section"><div className="settings-section-heading"><div><div className="section-kicker">PROFILE DATA</div><h2>Import and export</h2><p>Your profiles stay in this app on this computer unless you export them.</p></div><Icon name="layers" size={21} /></div><div className="settings-action-row"><button className="outline-button" onClick={onImport}><Icon name="upload" size={16} />Import profile JSON</button><button className="outline-button" onClick={onExport}><Icon name="download" size={16} />Export all profiles</button></div></section>
      <section className="panel settings-section settings-danger"><div className="settings-section-heading"><div><div className="section-kicker">LOCAL DATA</div><h2>Reset application data</h2><p>Remove saved profiles and return to the default simulator setup.</p></div><Icon name="trash" size={21} /></div><button className="danger-button" onClick={onReset}><Icon name="trash" size={16} />Reset local data</button></section>
      <section className="panel about-card"><div className="about-mark">H</div><div className="about-copy"><div className="section-kicker">ABOUT THIS APPLICATION</div><h2>HAVIT Gaming Control Center <span>0.1.0</span></h2><p>Created by Tiro as an independent community project. Not affiliated with, endorsed by, or an official application of HAVIT. “HAVIT” and “KB874L” are used to identify the compatibility target only.</p><div className="about-meta"><span>Windows desktop · Electron</span><span>·</span><span>Simulator-first</span><span>·</span><span>No telemetry</span></div></div></section>
    </div>
  </>;
}

export default App;

