import { NextResponse } from "next/server";
import { dbConnect } from "@/service/mongo";

export const dynamic = "force-dynamic";

import { Attempt } from "@/model/attemptv2-model";
import { Question } from "@/model/questionv2-model";
import { transcribeAudio } from "@/lib/ai/transcription";
import { evaluateOralAnswer } from "@/lib/ai/evaluation";
import mongoose from "mongoose";

/**
 * POST /api/evaluate-oral
 * Trigger async evaluation for an oral answer.
 * In a real production app, this should be a background job (e.g. Inngest, BullMQ).
 * For this MVP, we run it as an async process.
 */
export async function POST(req) {
    await dbConnect();
    try {
        const { attemptId, answerId } = await req.json();

        if (!attemptId || !answerId) {
            return NextResponse.json({ error: "Missing attemptId or answerId" }, { status: 400 });
        }

        // Run evaluation in the background without awaiting it for the response
        evaluateAsync(attemptId, answerId).catch(err => {
            console.error("[ASYNC_EVALUATION_FAILED]", err);
        });

        return NextResponse.json({ ok: true, message: "Evaluation started" });
    } catch (error) {
        console.error("[EVALUATE_ORAL_API_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function evaluateAsync(attemptId, answerId) {
    await dbConnect();
    
    // 1. Find attempt and answer
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) throw new Error("Attempt not found");

    const answer = attempt.answers.id(answerId);
    if (!answer) throw new Error("Answer not found in attempt");

    // 2. Find question for reference answer
    const question = await Question.findById(answer.questionId);
    if (!question) throw new Error("Question not found");

    try {
        // 3. Update status to evaluating
        answer.gradingStatus = "evaluating";
        await attempt.save();

        // 4. Transcribe audio
        const transcribedText = await transcribeAudio(answer.audioUrl);
        answer.transcribedText = transcribedText;
        await attempt.save();

        // 5. Evaluate against reference answer
        const evaluation = await evaluateOralAnswer(transcribedText, question.referenceAnswer);
        answer.score = evaluation.score;
        // In this system, score is stored at answer level, but total attempt score needs update
        answer.gradingStatus = "completed";
        
        // 6. Recalculate attempt score
        let totalScore = 0;
        attempt.answers.forEach(a => {
            // This assumes other questions are already graded
            // For oral, we use the AI score. For others, they might be graded differently.
            totalScore += a.score || 0;
        });
        
        // We might need total points from quiz to calc percentage
        const { Quiz } = await import("@/model/quizv2-model");
        const quiz = await Quiz.findById(attempt.quizId);
        
        const questions = await Question.find({ quizId: attempt.quizId });
        let totalPoints = 0;
        questions.forEach(q => totalPoints += q.points || 0);

        attempt.score = totalScore;
        if (totalPoints > 0) {
            attempt.scorePercent = Math.round((totalScore / totalPoints) * 100 * 100) / 100;
            attempt.passed = attempt.scorePercent >= (quiz.passPercent || 70);
        }

        await attempt.save();
        console.log(`[ASYNC_EVALUATION_SUCCESS] Answer ${answerId} graded: ${evaluation.score}`);
    } catch (error) {
        console.error(`[ASYNC_EVALUATION_ERROR] Answer ${answerId}:`, error);
        answer.gradingStatus = "failed";
        await attempt.save();
    }
}
