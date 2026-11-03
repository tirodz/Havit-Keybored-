export const HAVIT_KB874L_ID = Object.freeze({ vendorId: 0x05ac, productId: 0x024f });

type HidDevice = {
  vendorId: number;
  productId: number;
  productName: string;
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
};

type HidApi = EventTarget & {
  requestDevice(options: { filters: Array<{ vendorId: number; productId: number }> }): Promise<HidDevice[]>;
};

export type PhysicalDeviceSnapshot = {
  status: "disconnected" | "connected" | "unavailable" | "error";
  name: string;
  message: string;
};

function hidApi(): HidApi | undefined {
  return (navigator as Navigator & { hid?: HidApi }).hid;
}

class HavitHidConnection {
  private device: HidDevice | null = null;
  private state: PhysicalDeviceSnapshot = {
    status: "disconnected",
    name: "No physical device selected",
    message: "No HID device is open.",
  };
  private listeners = new Set<(snapshot: PhysicalDeviceSnapshot) => void>();

  constructor() {
    hidApi()?.addEventListener("disconnect", (event) => {
      const disconnectedDevice = (event as Event & { device?: HidDevice }).device;
      if (disconnectedDevice && disconnectedDevice === this.device) {
        this.device = null;
        this.update({ status: "disconnected", name: "HAVIT KB874L", message: "The keyboard was unplugged." });
      }
    });
  }

  snapshot(): PhysicalDeviceSnapshot {
    if (!hidApi() && this.state.status !== "connected") {
      return { status: "unavailable", name: "HID unavailable", message: "This Electron runtime does not expose WebHID." };
    }
    return this.state;
  }

  subscribe(listener: (snapshot: PhysicalDeviceSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  async connect(): Promise<PhysicalDeviceSnapshot> {
    const hid = hidApi();
    if (!hid) {
      return this.update({ status: "unavailable", name: "HID unavailable", message: "WebHID is not available in this Electron runtime." });
    }

    try {
      const devices = await hid.requestDevice({ filters: [HAVIT_KB874L_ID] });
      const device = devices[0];
      if (!device) {
        return this.update({ status: "disconnected", name: "No physical device selected", message: "No matching KB874L interface was selected." });
      }
      if (device.vendorId !== HAVIT_KB874L_ID.vendorId || device.productId !== HAVIT_KB874L_ID.productId) {
        return this.update({ status: "error", name: "Unrecognized HID device", message: "The selected device identity did not match the KB874L filter." });
      }

      if (this.device && this.device !== device && this.device.opened) await this.device.close();
      if (!device.opened) await device.open();
      this.device = device;
      return this.update({
        status: "connected",
        name: device.productName || "HAVIT KB874L HID interface",
        message: "Connected to the verified USB identity. This app has not sent any commands.",
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The HID connection failed.";
      return this.update({ status: "error", name: "Connection failed", message: detail });
    }
  }

  async disconnect(): Promise<PhysicalDeviceSnapshot> {
    if (this.device?.opened) {
      try {
        await this.device.close();
      } catch (error) {
        const detail = error instanceof Error ? error.message : "The HID interface could not be closed.";
        return this.update({ status: "error", name: this.device.productName || "HAVIT KB874L", message: detail });
      }
    }
    this.device = null;
    return this.update({ status: "disconnected", name: "No physical device selected", message: "The HID interface is closed." });
  }

  private update(snapshot: PhysicalDeviceSnapshot): PhysicalDeviceSnapshot {
    this.state = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }
}

export const havitHidConnection = new HavitHidConnection();
