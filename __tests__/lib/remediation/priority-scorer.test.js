import { calculatePriorityScore } from "@/lib/remediation/priority-scorer";

describe("calculatePriorityScore", () => {
  const fixedNow = new Date("2026-06-15T12:00:00.000Z").getTime();

  it("returns 0 for empty or missing sources", () => {
    expect(calculatePriorityScore({ sources: [] }, fixedNow)).toBe(0);
    expect(calculatePriorityScore({}, fixedNow)).toBe(0);
  });

  it("returns a bounded score 0–100", () => {
    const row = {
      sources: [
        { type: "bat", failedAt: new Date(fixedNow - 86400000) },
        { type: "oral", failedAt: new Date(fixedNow - 86400000) },
      ],
    };
    const score = calculatePriorityScore(row, fixedNow);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("ranks higher when failures are more frequent (more unique sources)", () => {
    const one = {
      sources: [{ type: "bat", failedAt: new Date(fixedNow - 86400000) }],
    };
    const many = {
      sources: [
        { type: "bat", failedAt: new Date(fixedNow - 86400000) },
        { type: "bat", failedAt: new Date(fixedNow - 2 * 86400000) },
        { type: "bat", failedAt: new Date(fixedNow - 3 * 86400000) },
      ],
    };
    expect(calculatePriorityScore(many, fixedNow)).toBeGreaterThan(
      calculatePriorityScore(one, fixedNow)
    );
  });

  it("ranks higher when the most recent failure is more recent", () => {
    const base = {
      sources: [{ type: "bat", failedAt: new Date(fixedNow - 10 * 86400000) }],
    };
    const recent = {
      sources: [{ type: "bat", failedAt: new Date(fixedNow - 86400000) }],
    };
    expect(calculatePriorityScore(recent, fixedNow)).toBeGreaterThan(
      calculatePriorityScore(base, fixedNow)
    );
  });

  it("ranks higher when both BAT and Oral appear than a single source alone", () => {
    const batOnly = {
      sources: [
        { type: "bat", failedAt: new Date(fixedNow - 86400000) },
        { type: "bat", failedAt: new Date(fixedNow - 2 * 86400000) },
      ],
    };
    const batAndOral = {
      sources: [
        { type: "bat", failedAt: new Date(fixedNow - 86400000) },
        { type: "oral", failedAt: new Date(fixedNow - 86400000) },
      ],
    };
    expect(calculatePriorityScore(batAndOral, fixedNow)).toBeGreaterThan(
      calculatePriorityScore(batOnly, fixedNow)
    );
  });
});
