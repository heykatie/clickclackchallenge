import { describe, expect, it } from "vitest";
import { createStartKeyGate } from "./startKey";

function fakeTarget() {
  const listeners = new Set<(event: { key: string }) => void>();
  return {
    target: {
      addEventListener(_type: "keyup", listener: (event: { key: string }) => void) {
        listeners.add(listener);
      },
      removeEventListener(_type: "keyup", listener: (event: { key: string }) => void) {
        listeners.delete(listener);
      },
    },
    release(key: string) {
      for (const listener of [...listeners]) {
        listener({ key });
      }
    },
  };
}

describe("createStartKeyGate", () => {
  it("blocks the key held to leave Ready until that key is released", () => {
    const keys = fakeTarget();
    const gate = createStartKeyGate(keys.target);

    gate.arm(" ");

    expect(gate.isBlocked(" ")).toBe(true);
    expect(gate.isBlocked("A")).toBe(false);
    keys.release(" ");
    expect(gate.isBlocked(" ")).toBe(false);
  });

  it("does not let releasing an older key unblock the key held now", () => {
    const keys = fakeTarget();
    const gate = createStartKeyGate(keys.target);

    gate.arm("a");
    gate.arm(" ");
    keys.release("a");

    expect(gate.isBlocked(" ")).toBe(true);
    keys.release(" ");
    expect(gate.isBlocked(" ")).toBe(false);
  });
});
