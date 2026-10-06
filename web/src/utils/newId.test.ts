import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "@/utils/newId";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("makes a UUID", () => {
    expect(newId()).toMatch(UUID);
  });

  it("still makes one without crypto.randomUUID, as on plain HTTP", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = new Set(Array.from({ length: 50 }, newId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID);
  });
});
