import type { LightingEffect, Profile } from "../domain/profiles";

export type DeviceStatus = "connected" | "disconnected";

export type DeviceSnapshot = {
  status: DeviceStatus;
  name: string;
  mode: "simulator";
  lastAction: string;
};

export type DeviceOutcome = {
  ok: boolean;
  message: string;
  at: string;
};

export interface DeviceProvider {
  snapshot(): DeviceSnapshot;
  connect(): Promise<DeviceOutcome>;
  disconnect(): Promise<DeviceOutcome>;
  applyLighting(settings: Profile["lighting"]): Promise<DeviceOutcome>;
  applyKeyMap(key: string, value: string): Promise<DeviceOutcome>;
  failNextOperation(): void;
}

export class SimulatorDevice implements DeviceProvider {
  private status: DeviceStatus = "connected";
  private lastAction = "Simulator ready";
  private failNext = false;

  snapshot(): DeviceSnapshot {
    return { status: this.status, name: "KB874L · offline simulator", mode: "simulator", lastAction: this.lastAction };
  }

  private outcome(message: string): DeviceOutcome {
    const at = new Date().toISOString();
    if (this.failNext) {
      this.failNext = false;
      this.lastAction = "Simulated communication error";
      return { ok: false, message: "Simulated communication error. The profile remains saved locally.", at };
    }
    this.lastAction = message;
    return { ok: true, message, at };
  }

  async connect(): Promise<DeviceOutcome> {
    this.status = "connected";
    return this.outcome("Simulator connected");
  }

  async disconnect(): Promise<DeviceOutcome> {
    this.status = "disconnected";
    return this.outcome("Simulator disconnected");
  }

  async applyLighting(settings: { effect: LightingEffect; color: string; brightness: number; speed: number }): Promise<DeviceOutcome> {
    if (this.status !== "connected") return { ok: false, message: "The simulator is disconnected.", at: new Date().toISOString() };
    return this.outcome(`Preview applied in simulator · ${settings.effect}`);
  }

  async applyKeyMap(key: string, value: string): Promise<DeviceOutcome> {
    if (this.status !== "connected") return { ok: false, message: "The simulator is disconnected.", at: new Date().toISOString() };
    return this.outcome(`${key} assigned to ${value} in simulator`);
  }

  failNextOperation(): void {
    this.failNext = true;
  }
}

export const deviceProvider: DeviceProvider = new SimulatorDevice();
