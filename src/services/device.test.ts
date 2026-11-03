import { describe, expect, it } from "vitest";
import { SimulatorDevice } from "./device";

describe("offline simulator", () => {
  it("starts connected and identifies itself as simulation", () => {
    const device = new SimulatorDevice();
    expect(device.snapshot()).toMatchObject({ status: "connected", mode: "simulator" });
  });

  it("records simulated lighting actions", async () => {
    const device = new SimulatorDevice();
    const result = await device.applyLighting({ effect: "Wave", color: "#63a6ff", brightness: 65, speed: 40 });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("simulator");
    expect(device.snapshot().lastAction).toContain("Wave");
  });

  it("rejects operations while disconnected", async () => {
    const device = new SimulatorDevice();
    await device.disconnect();
    expect(device.snapshot().status).toBe("disconnected");
    const result = await device.applyKeyMap("KeyA", "B");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/disconnected/i);
  });

  it("injects one deterministic communication error", async () => {
    const device = new SimulatorDevice();
    device.failNextOperation();
    const failed = await device.applyLighting({ effect: "Static", color: "#ffffff", brightness: 40, speed: 0 });
    const next = await device.applyLighting({ effect: "Static", color: "#ffffff", brightness: 40, speed: 0 });
    expect(failed.ok).toBe(false);
    expect(next.ok).toBe(true);
  });
});
