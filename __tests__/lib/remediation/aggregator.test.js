import mongoose from "mongoose";
import { normalizeConceptTag, mergeWeaknessEvents } from "@/lib/remediation/aggregator";
import { calculatePriorityScore } from "@/lib/remediation/priority-scorer";

describe("normalizeConceptTag", () => {
  it("lowercases and trims", () => {
    expect(normalizeConceptTag("  Recursion  ")).toBe("recursion");
  });

  it("returns empty for non-strings", () => {
    expect(normalizeConceptTag(null)).toBe("");
  });
});

describe("mergeWeaknessEvents", () => {
  it("merges BAT and Oral into one row per normalized tag", () => {
    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    const merged = mergeWeaknessEvents([
      {
        conceptTag: "Recursion",
        normalizedTag: "recursion",
        sourceType: "bat",
        sourceId: id1,
        failedAt: new Date("2026-01-01"),
      },
      {
        conceptTag: "recursion",
        normalizedTag: "recursion",
        sourceType: "oral",
        sourceId: id2,
        failedAt: new Date("2026-01-15"),
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].failureCount).toBe(2);
    expect(merged[0].sources.map((s) => s.type).sort()).toEqual(["bat", "oral"]);
  });

  it("dedupes same source id", () => {
    const id1 = new mongoose.Types.ObjectId();
    const merged = mergeWeaknessEvents([
      {
        conceptTag: "Loops",
        normalizedTag: "loops",
        sourceType: "bat",
        sourceId: id1,
        failedAt: new Date("2026-01-01"),
      },
      {
        conceptTag: "loops",
        normalizedTag: "loops",
        sourceType: "bat",
        sourceId: id1,
        failedAt: new Date("2026-02-01"),
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].failureCount).toBe(1);
  });
});

describe("mergeWeaknessEvents priority", () => {
  it("assigns bounded priority scores via calculatePriorityScore", () => {
    const row = {
      sources: [
        { type: "bat", failedAt: new Date() },
        { type: "oral", failedAt: new Date() },
      ],
    };
    const score = calculatePriorityScore(row);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
