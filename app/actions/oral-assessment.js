"use server";

import { dbConnect } from "@/service/mongo";
import { OralAssessment } from "@/model/oral-assessment.model";
import { StudentResponse } from "@/model/student-response.model";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import { computeSemanticSimilarity } from "@/lib/ai/semantic-similarity";
import { analyzeConceptCoverage } from "@/lib/ai/concept-coverage";
import { oralAssessmentSubmissionSchema } from "@/lib/validations";
import mongoose from "mongoose";

// Mock next-intl/server if it's used elsewhere, though not in this file.
// But we should check if any other imports might cause issues.


/**
 * Get all approved oral assessment points for a lesson.
 * Auth: Verify student is enrolled in the course.
 */
export async function getAssessmentPoints(lessonId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { ok: false, error: "Unauthorized" };
        }

        const assessments = await OralAssessment.find({
            lessonId: new mongoose.Types.ObjectId(lessonId),
            status: "approved"
        }).sort({ triggerTimestamp: 1 }).lean();

        if (assessments.length === 0) {
            return { ok: true, assessments: [] };
        }

        // Verify enrollment for the course of these assessments
        const courseId = assessments[0].courseId.toString();
        const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
        
        if (!isEnrolled && user.role !== 'admin' && user.role !== 'instructor') {
            return { ok: false, error: "You must be enrolled in this course to access assessments." };
        }

        return { 
            ok: true, 
            assessments: assessments.map(a => ({
                id: a._id.toString(),
                questionText: a.questionText,
                triggerTimestamp: a.triggerTimestamp,
                passingThreshold: a.passingThreshold
            }))
        };
    } catch (error) {
        console.error("[GET_ASSESSMENT_POINTS_ERROR]", error);
        return { ok: false, error: "Failed to fetch assessment points." };
    }
}

/**
 * Submit an oral response for evaluation.
 * Auth: Verify student is enrolled in the course.
 */
export async function submitOralResponse(data) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { ok: false, error: "Unauthorized" };
        }

        const parsed = oralAssessmentSubmissionSchema.safeParse(data);
        if (!parsed.success) {
            return { ok: false, error: "Invalid submission data." };
        }

        const { assessmentId, lessonId, courseId, transcription, inputMethod, attemptNumber } = parsed.data;

        // Verify enrollment
        const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
        if (!isEnrolled && user.role !== 'admin' && user.role !== 'instructor') {
            return { ok: false, error: "You must be enrolled in this course to submit responses." };
        }

        // Get assessment details
        const assessment = await OralAssessment.findById(assessmentId).lean();
        if (!assessment) {
            return { ok: false, error: "Assessment not found." };
        }

        // 1. Compute semantic similarity
        const similarityScore = await computeSemanticSimilarity(transcription, assessment.referenceAnswer);

        // 2. Analyze concept coverage
        const coverage = await analyzeConceptCoverage(transcription, assessment.keyConcepts);

        // 3. Determine if passed
        const passed = similarityScore >= (assessment.passingThreshold || 0.6);

        // 4. Save response
        const response = await StudentResponse.create({
            assessmentId: new mongoose.Types.ObjectId(assessmentId),
            userId: new mongoose.Types.ObjectId(user.id),
            lessonId: new mongoose.Types.ObjectId(lessonId),
            transcription,
            similarityScore,
            conceptsCovered: coverage.addressed,
            conceptsMissing: coverage.missing,
            passed,
            inputMethod,
            attemptNumber
        });

        try {
            const { enqueueRemediationAggregation } = await import("@/service/remediation-queue");
            enqueueRemediationAggregation({
                courseId,
                studentId: user.id,
                resolution: { assessmentType: "oral", assessmentId: response._id },
            });
        } catch (e) {
            console.error("[ORAL_REMEDIATION_ENQUEUE]", e);
        }

        return {
            ok: true,
            result: {
                id: response._id.toString(),
                similarityScore,
                conceptsCovered: coverage.addressed,
                conceptsMissing: coverage.missing,
                passed,
                feedback: passed ? "Great job! You've captured the key points." : "Not quite. Try to include more details from the lecture."
            }
        };
    } catch (error) {
        console.error("[SUBMIT_ORAL_RESPONSE_ERROR]", error);
        return { ok: false, error: "Failed to submit response." };
    }
}

/**
 * Create a new oral assessment (Instructor only).
 * Auth: Verify instructor owns the course.
 */
export async function createOralAssessment(courseId, lessonId, data) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
            return { ok: false, error: "Unauthorized" };
        }

        // Verify course ownership
        const { assertInstructorOwnsCourse } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(courseId, user.id, user);

        const assessment = await OralAssessment.create({
            courseId: new mongoose.Types.ObjectId(courseId),
            lessonId: new mongoose.Types.ObjectId(lessonId),
            ...data,
            createdBy: new mongoose.Types.ObjectId(user.id),
            status: "approved" // Default to approved for now
        });

        return { ok: true, assessmentId: assessment._id.toString() };
    } catch (error) {
        console.error("[CREATE_ORAL_ASSESSMENT_ERROR]", error);
        return { ok: false, error: "Failed to create assessment." };
    }
}

/**
 * Update an existing oral assessment (Instructor only).
 * Auth: Verify instructor owns the course.
 */
export async function updateOralAssessment(assessmentId, data) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
            return { ok: false, error: "Unauthorized" };
        }

        const assessment = await OralAssessment.findById(assessmentId);
        if (!assessment) {
            return { ok: false, error: "Assessment not found" };
        }

        // Verify ownership
        const { assertInstructorOwnsCourse } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(assessment.courseId, user.id, user);

        // Update allowed fields
        const allowedFields = ['questionText', 'referenceAnswer', 'keyConcepts', 'passingThreshold', 'triggerTimestamp'];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                assessment[field] = data[field];
            }
        }

        await assessment.save();

        return { ok: true, assessmentId: assessment._id.toString() };
    } catch (error) {
        console.error("[UPDATE_ORAL_ASSESSMENT_ERROR]", error);
        return { ok: false, error: "Failed to update assessment." };
    }
}

/**
 * Review an oral assessment (Instructor only).
 * Auth: Verify instructor owns the course.
 */
export async function reviewOralAssessment(assessmentId, status) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
            return { ok: false, error: "Unauthorized" };
        }

        const assessment = await OralAssessment.findById(assessmentId);
        if (!assessment) {
            return { ok: false, error: "Assessment not found" };
        }

        // Verify ownership
        const { assertInstructorOwnsCourse } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(assessment.courseId, user.id, user);

        assessment.status = status;
        await assessment.save();

        return { ok: true };
    } catch (error) {
        console.error("[REVIEW_ORAL_ASSESSMENT_ERROR]", error);
        return { ok: false, error: "Failed to review assessment." };
    }
}

/**
 * Trigger AI generation of oral assessment points for a lesson (Instructor only).
 * Auth: Verify instructor owns the course.
 */
export async function triggerOralAssessmentGeneration(courseId, lessonId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
            return { ok: false, error: "Unauthorized" };
        }

        // Verify course ownership
        const { assertInstructorOwnsCourse } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(courseId, user.id, user);

        // 1. Get lesson content (transcript)
        const { VideoTranscript } = await import("@/model/video-transcript.model");
        const transcript = await VideoTranscript.findOne({ lessonId: new mongoose.Types.ObjectId(lessonId) }).lean();
        
        if (!transcript || !transcript.segments || transcript.segments.length === 0) {
            return { ok: false, error: "No transcript found for this lesson. Please ensure the video is processed first." };
        }

        const fullText = transcript.segments.map(s => s.text).join(" ");

        // 2. Call Gemini to generate assessment points
        const client = new (await import("openai")).default({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert instructional designer. Based on the provided lecture transcript, identify 3-5 key moments where an oral assessment would reinforce learning.
                    
                    For each point, provide:
                    1. triggerTimestamp: The time in seconds when the question should appear (must be within the video duration).
                    2. questionText: A clear, concise oral question.
                    3. referenceAnswer: A model answer for semantic comparison.
                    4. keyConcepts: A list of 2-4 essential terms or concepts that should be in the student's answer.
                    5. passingThreshold: A recommended similarity score (0.5 to 0.8).

                    Return your response EXACTLY in this JSON format:
                    {
                        "assessments": [
                            {
                                "triggerTimestamp": number,
                                "questionText": "string",
                                "referenceAnswer": "string",
                                "keyConcepts": ["string"],
                                "passingThreshold": number
                            }
                        ]
                    }`
                },
                {
                    role: "user",
                    content: `Lecture Transcript: "${fullText.substring(0, 15000)}"` // Limit to ~15k chars for context window
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = JSON.parse(response.choices[0].message.content);
        const generatedAssessments = content.assessments;

        // 3. Save as pending assessments
        const created = [];
        for (const data of generatedAssessments) {
            // Avoid duplicates at same timestamp
            const existing = await OralAssessment.findOne({ 
                lessonId: new mongoose.Types.ObjectId(lessonId), 
                triggerTimestamp: data.triggerTimestamp 
            });
            
            if (!existing) {
                const assessment = await OralAssessment.create({
                    courseId: new mongoose.Types.ObjectId(courseId),
                    lessonId: new mongoose.Types.ObjectId(lessonId),
                    ...data,
                    createdBy: new mongoose.Types.ObjectId(user.id),
                    status: "pending" // Generated points require review
                });
                created.push(assessment._id.toString());
            }
        }

        return { ok: true, count: created.length };
    } catch (error) {
        console.error("[TRIGGER_ORAL_GENERATION_ERROR]", error);
        return { ok: false, error: "Failed to generate assessments. Please try again later." };
    }
}

/**
 * Get concept gap summary for a student in a lesson.
 * Auth: Verify student is enrolled in the course.
 */
export async function getConceptGapSummary(lessonId, courseId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { ok: false, error: "Unauthorized" };
        }

        // Verify enrollment if courseId provided
        if (courseId) {
            const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
            if (!isEnrolled && user.role !== 'admin' && user.role !== 'instructor') {
                return { ok: false, error: "You must be enrolled in this course to view concept gaps." };
            }
        }

        const { ConceptGap } = await import("@/model/concept-gap.model");
        
        const gaps = await ConceptGap.find({
            userId: new mongoose.Types.ObjectId(user.id),
            lessonId: new mongoose.Types.ObjectId(lessonId),
            flaggedForReview: true
        }).lean();

        return { 
            ok: true, 
            gaps: gaps.map(g => ({
                id: g._id.toString(),
                concept: g.concept,
                failureCount: g.failureCount,
                source: g.source,
                createdAt: g.createdAt
            }))
        };
    } catch (error) {
        console.error("[GET_CONCEPT_GAP_SUMMARY_ERROR]", error);
        return { ok: false, error: "Failed to fetch concept gap summary." };
    }
}

/**
 * Get analytics for oral assessments in a lesson (Instructor/Admin only).
 */
export async function getOralAssessmentAnalytics(courseId, lessonId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
            return { ok: false, error: "Unauthorized" };
        }

        // Verify course ownership
        const { assertInstructorOwnsCourse } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(courseId, user.id, user);

        const assessments = await OralAssessment.find({ lessonId: new mongoose.Types.ObjectId(lessonId) }).lean();
        const assessmentIds = assessments.map(a => a._id);

        const responses = await StudentResponse.find({ 
            assessmentId: { $in: assessmentIds } 
        }).lean();

        // Aggregate stats
        const stats = assessments.map(a => {
            const aResponses = responses.filter(r => r.assessmentId.toString() === a._id.toString());
            const totalAttempts = aResponses.length;
            const uniqueUsers = new Set(aResponses.map(r => r.userId.toString())).size;
            const passedAttempts = aResponses.filter(r => r.passed).length;
            const passRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) : 0;
            
            // Average similarity score
            const avgSimilarity = totalAttempts > 0 
                ? aResponses.reduce((sum, r) => sum + r.similarityScore, 0) / totalAttempts 
                : 0;

            return {
                assessmentId: a._id.toString(),
                questionText: a.questionText,
                triggerTimestamp: a.triggerTimestamp,
                totalAttempts,
                uniqueUsers,
                passRate,
                avgSimilarity,
                status: a.status
            };
        });

        return { ok: true, stats };
    } catch (error) {
        console.error("[GET_ORAL_ANALYTICS_ERROR]", error);
        return { ok: false, error: "Failed to fetch analytics." };
    }
}
