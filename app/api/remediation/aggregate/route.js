import { NextResponse } from "next/server";
import { runStudentWeaknessAggregation } from "@/lib/remediation/run-aggregation";

/**
 * Internal/cron trigger for weakness aggregation (Bearer or x-remediation-secret).
 * POST JSON: { "courseId": string, "studentId": string }
 */
export async function POST(request) {
  const secret = process.env.REMEDIATION_AGGREGATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "REMEDIATION_AGGREGATE_SECRET is not configured" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-remediation-secret");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : headerSecret;
  if (!token || token !== secret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const courseId = body?.courseId;
  const studentId = body?.studentId;
  if (!courseId || !studentId || typeof courseId !== "string" || typeof studentId !== "string") {
    return NextResponse.json(
      { success: false, error: "courseId and studentId are required" },
      { status: 400 }
    );
  }

  try {
    const { profile } = await runStudentWeaknessAggregation(studentId, courseId);
    return NextResponse.json({
      success: true,
      data: {
        profileId: profile._id.toString(),
        lastAggregatedAt: profile.lastAggregatedAt?.toISOString?.() ?? null,
      },
    });
  } catch (err) {
    console.error("[POST /api/remediation/aggregate]", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Aggregation failed" },
      { status: 500 }
    );
  }
}
