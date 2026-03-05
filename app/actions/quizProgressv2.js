"use server";

import { dbConnect } from "@/service/mongo";
import { Report } from "@/model/report-model";
import { getStudentQuizStatusMap, getCourseQuizzes } from "@/queries/quizv2";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import mongoose from "mongoose";

/**
 * Checks if student can download certificate (all required quizzes passed).
 * US3: T018
 */
export async function checkCertificateEligibility(courseId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { ok: false, error: "Unauthorized" };
        }

        // Check enrollment
        const enrolled = await hasEnrollmentForCourse(courseId, user.id);
        if (!enrolled) {
            return { ok: false, error: "You must be enrolled in this course" };
        }

        // Get all required quizzes for the course
        const allQuizzes = await getCourseQuizzes(courseId, {
            forStudent: true,
            includeUnpublished: false
        });
        const requiredQuizzes = allQuizzes.filter(q => q.required);

        if (requiredQuizzes.length === 0) {
            return { ok: true, eligible: true };
        }

        // Get student's quiz status map
        const statusMap = await getStudentQuizStatusMap(courseId, user.id);

        const pendingQuizzes = [];
        for (const quiz of requiredQuizzes) {
            const status = statusMap[quiz.id];
            if (!status || !status.passed) {
                pendingQuizzes.push({
                    quizId: quiz.id,
                    title: quiz.title,
                    status: status ? (status.status === "in_progress" ? "in_progress" : "failed") : "not_started"
                });
            }
        }

        if (pendingQuizzes.length > 0) {
            return {
                ok: true,
                eligible: false,
                reason: "You must pass all required quizzes to download the certificate.",
                pendingQuizzes
            };
        }

        return { ok: true, eligible: true };
    } catch (error) {
        console.error("[CHECK_CERTIFICATE_ELIGIBILITY] Error:", error);
        return { ok: false, error: error.message || "Failed to check eligibility" };
    }
}

/**
 * Gets quiz completion status for course progress display.
 * US3: T019
 */
export async function getCourseQuizProgress(courseId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return { ok: false, error: "Unauthorized" };
        }

        // Check enrollment
        const enrolled = await hasEnrollmentForCourse(courseId, user.id);
        if (!enrolled) {
            return { ok: false, error: "You must be enrolled in this course" };
        }

        // Get all published quizzes for the course
        const allQuizzes = await getCourseQuizzes(courseId, {
            forStudent: true,
            includeUnpublished: false
        });

        // Get student's quiz status map
        const statusMap = await getStudentQuizStatusMap(courseId, user.id);

        const quizzes = allQuizzes.map(quiz => {
            const status = statusMap[quiz.id] || {
                status: "not_started",
                passed: false,
                attemptsUsed: 0,
                lastScore: null
            };

            return {
                quizId: quiz.id,
                title: quiz.title,
                required: quiz.required || false,
                status: status.passed ? "passed" : (status.status === "in_progress" ? "in_progress" : (status.attemptsUsed > 0 ? "failed" : "not_started")),
                bestScore: status.lastScore,
                attemptsUsed: status.attemptsUsed,
                maxAttempts: quiz.maxAttempts
            };
        });

        return { ok: true, quizzes };
    } catch (error) {
        console.error("[GET_COURSE_QUIZ_PROGRESS] Error:", error);
        return { ok: false, error: error.message || "Failed to get quiz progress" };
    }
}

/**
 * Update quiz completion status in report when a quiz is submitted/passed
 */
export async function updateQuizCompletionInReport(courseId, userId, quizId, lessonId = null) {
    await dbConnect();
    try {
        let report = await Report.findOne({
            course: new mongoose.Types.ObjectId(courseId),
            student: new mongoose.Types.ObjectId(userId)
        });

        if (!report) {
            report = await Report.create({
                course: courseId,
                student: userId,
                totalCompletedLessons: [],
                totalCompletedModules: [],
                passedQuizIds: [],
                latestQuizAttemptByQuiz: {}
            });
        }

        // Ensure arrays are initialized
        if (!report.passedQuizIds) report.passedQuizIds = [];
        if (!report.latestQuizAttemptByQuiz) report.latestQuizAttemptByQuiz = {};

        // Get quiz status to determine if passed
        const quizStatusMap = await getStudentQuizStatusMap(courseId, userId);
        const status = quizStatusMap[quizId];

        // Add quiz to passed list if passed
        if (status && status.passed) {
            const quizObjId = new mongoose.Types.ObjectId(quizId);
            if (!report.passedQuizIds.some(id => id.toString() === quizId)) {
                report.passedQuizIds.push(quizObjId);
            }
        }

        // Update latest attempt mapping
        if (status && status.latestAttemptId) {
            const attemptMap = typeof report.latestQuizAttemptByQuiz === 'object' && !Array.isArray(report.latestQuizAttemptByQuiz) 
                ? report.latestQuizAttemptByQuiz 
                : {};
            attemptMap[quizId] = status.latestAttemptId;
            report.latestQuizAttemptByQuiz = attemptMap;
        }

        // Re-check lesson completion if this is a lesson quiz
        if (lessonId && status && status.passed) {
            const allQuizzes = await getCourseQuizzes(courseId, {
                forStudent: false,
                includeUnpublished: false
            });
            const lessonRequiredQuizzes = allQuizzes.filter(
                q => q.lessonId && q.lessonId.toString() === lessonId.toString() && q.required
            );
            
            const allRequiredPassed = lessonRequiredQuizzes.length === 0 || lessonRequiredQuizzes.every(q => {
                const qId = q.id || q._id?.toString();
                const qStatus = quizStatusMap[qId];
                return qStatus && qStatus.passed;
            });

            // Check if lesson watch is completed
            const { Watch } = await import("@/model/watch-model");
            const watch = await Watch.findOne({
                user: new mongoose.Types.ObjectId(userId),
                lesson: new mongoose.Types.ObjectId(lessonId),
                state: 'completed'
            }).lean();

            if (watch && allRequiredPassed) {
                const lessonObjId = new mongoose.Types.ObjectId(lessonId);
                if (!report.totalCompletedLessons.some(id => id.toString() === lessonId)) {
                    report.totalCompletedLessons.push(lessonObjId);
                    
                    // Check module completion
                    const { Module } = await import("@/model/module.model");
                    const courseModule = await Module.findOne({
                        lessonIds: lessonObjId
                    }).lean();
                    
                    if (courseModule) {
                        const { getCourseDetails } = await import("@/queries/courses");
                        const courseDetails = await getCourseDetails(courseId);
                        const moduleData = courseDetails?.modules?.find(m => {
                            const moduleId = m._id?.toString() || m.id;
                            return moduleId === courseModule._id.toString();
                        });
                        
                        if (moduleData) {
                            const allLessonsCompleted = (moduleData.lessonIds || []).every(lesson => {
                                const lessonIdStr = lesson._id?.toString() || lesson.id;
                                return report.totalCompletedLessons.some(id => id.toString() === lessonIdStr);
                            });
                            
                            if (allLessonsCompleted) {
                                const moduleObjId = new mongoose.Types.ObjectId(module._id);
                                if (!report.totalCompletedModules.some(id => id.toString() === module._id.toString())) {
                                    report.totalCompletedModules.push(moduleObjId);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Re-check course completion
        const allQuizzes = await getCourseQuizzes(courseId, {
            forStudent: false,
            includeUnpublished: false
        });
        const courseRequiredQuizzes = allQuizzes.filter(q => !q.lessonId && q.required);
        const allCourseQuizzesPassed = courseRequiredQuizzes.length === 0 || courseRequiredQuizzes.every(q => {
            const qId = q.id || q._id?.toString();
            const qStatus = quizStatusMap[qId];
            return qStatus && qStatus.passed;
        });

        const { getCourseDetails } = await import("@/queries/courses");
        const courseDetails = await getCourseDetails(courseId);
        const moduleCount = courseDetails?.modules?.length || 0;
        const completedModuleCount = report.totalCompletedModules?.length || 0;

        if (moduleCount > 0 && completedModuleCount === moduleCount && allCourseQuizzesPassed) {
            report.completion_date = new Date();
        }

        await report.save();
        
        return { ok: true };
    } catch (error) {
        console.error("[UPDATE_QUIZ_COMPLETION] Error:", error);
        return { ok: false, error: error.message };
    }
}
