import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { Attempt } from "@/model/attemptv2-model";
import { dbConnect } from "@/service/mongo";
import { isAdmin, verifyInstructorOwnsCourse } from "@/lib/authorization";
import mongoose from "mongoose";

/** GET answer status by answer ID. */
export async function GET(request, { params }) {
    await dbConnect();
    try {
        const { answerId } = await params;
        if (!answerId || !mongoose.Types.ObjectId.isValid(answerId)) {
            return NextResponse.json(
                { ok: false, error: "Invalid answer ID" },
                { status: 400 }
            );
        }

        const user = await getLoggedInUser();
        if (!user) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Find the attempt containing this answer
        const attempt = await Attempt.findOne({ "answers._id": answerId })
            .populate("quizId")
            .lean();

        if (!attempt) {
            return NextResponse.json(
                { ok: false, error: "Answer not found" },
                { status: 404 }
            );
        }

        // Verify ownership
        const isInstructorOrAdmin = user.role === "instructor" || user.role === "admin";
        const attemptStudentId = attempt.studentId.toString();
        const isOwner = attemptStudentId === user.id;

        if (!isOwner && !isInstructorOrAdmin) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized" },
                { status: 403 }
            );
        }

        if (isInstructorOrAdmin && !isOwner) {
            const quizCourseId = attempt.quizId?.courseId?.toString();
            if (!quizCourseId) {
                return NextResponse.json({ ok: false, error: "Invalid quiz data" }, { status: 400 });
            }
            const ownsCourse = await verifyInstructorOwnsCourse(quizCourseId, user.id, user);
            if (!ownsCourse && !isAdmin(user)) {
                return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
            }
        }

        // Extract the specific answer
        const answer = attempt.answers.find(a => a._id.toString() === answerId);

        return NextResponse.json({
            ok: true,
            status: answer.gradingStatus,
            score: answer.score, // Note: answer doesn't have score in schema yet? Let's check attempt schema.
            feedback: answer.transcribedText // Or dedicated feedback field? The spec said "transcribedText".
        });
    } catch (error) {
        console.error("[GET_ANSWER_STATUS] Error:", error);
        return NextResponse.json(
            { ok: false, error: "Failed to get answer status" },
            { status: 500 }
        );
    }
}
