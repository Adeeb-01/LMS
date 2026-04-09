import { runStudentWeaknessAggregation } from "@/lib/remediation/run-aggregation";

/** Debounce window so rapid submissions (e.g. retries) coalesce into one run; stays under the 30s SLA. */
export const REMEDIATION_AGGREGATION_DEBOUNCE_MS = 800;

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const pendingTimers = new Map();

/**
 * Schedules a near-term weakness profile recomputation for a student/course pair.
 * @param {{ courseId: string, studentId: string, resolution?: { assessmentType: "bat"|"oral", assessmentId: import("mongoose").Types.ObjectId|string } }} params
 */
export function enqueueRemediationAggregation({ courseId, studentId, resolution }) {
  const key = `${studentId}:${courseId}`;
  const existing = pendingTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    runStudentWeaknessAggregation(studentId, courseId, resolution ? { resolution } : {}).catch(
      (err) => {
        console.error("[enqueueRemediationAggregation]", err);
      }
    );
  }, REMEDIATION_AGGREGATION_DEBOUNCE_MS);

  pendingTimers.set(key, timer);
}

/**
 * Test helper: clears pending debounced jobs without running them.
 */
export function __clearRemediationAggregationTimersForTests() {
  for (const t of pendingTimers.values()) clearTimeout(t);
  pendingTimers.clear();
}
