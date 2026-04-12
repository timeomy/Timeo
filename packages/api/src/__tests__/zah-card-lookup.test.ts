import { describe, expect, it } from "vitest";
import { getZahLookupCandidates } from "../lib/zah-card-lookup.js";

describe("getZahLookupCandidates", () => {
  it("returns person_id suffix variants", () => {
    const candidates = getZahLookupCandidates("999_0");

    expect(candidates).toContain("999_0");
    expect(candidates).toContain("999");
  });

  it("maps 8-char hex IDs to decimal variants", () => {
    const candidates = getZahLookupCandidates("6A5A0000");

    expect(candidates).toContain("6A5A0000");
    expect(candidates).toContain("1784283136");
  });

  it("maps decimal wiegand IDs to hex variants", () => {
    const candidates = getZahLookupCandidates("1784283136");

    expect(candidates).toContain("1784283136");
    expect(candidates).toContain("6A5A0000");
  });
});
