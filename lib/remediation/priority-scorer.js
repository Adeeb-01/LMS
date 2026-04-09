/**
 * Priority scoring for weakness rows (research.md): frequency, recency, source diversity.
 * Output is 0–100 for dashboard display and persistence.
 *
 * @param {{ sources: Array<{ type: "bat"|"oral", failedAt: Date|string }> }} row
 * @param {number} [nowMs] Optional clock for tests (defaults to Date.now())
 * @returns {number}
 */
export function calculatePriorityScore(row, nowMs = Date.now()) {
  const sources = row?.sources;
  if (!Array.isArray(sources) || sources.length === 0) return 0;

  const failureCount = sources.length;
  const lastMs = Math.max(
    ...sources.map((s) => new Date(s.failedAt).getTime())
  );
  const daysSince = (nowMs - lastMs) / 86400000;
  const recencyNorm = 1 / (Math.max(0, daysSince) + 1);

  const hasBat = sources.some((s) => s.type === "bat");
  const hasOral = sources.some((s) => s.type === "oral");
  const sourceCount = hasBat && hasOral ? 2 : 1;
  const diversityNorm = sourceCount / 2;

  const freqNorm = Math.min(1, failureCount / 10);

  const blend =
    0.4 * freqNorm + 0.35 * recencyNorm + 0.25 * diversityNorm;

  return Math.min(100, Math.round(blend * 100));
}
