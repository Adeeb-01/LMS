import "server-only";
import { dbConnect } from "@/service/mongo";
import { Course } from "@/model/course-model";
import { Report } from "@/model/report-model";
import { Enrollment } from "@/model/enrollment-model";
import mongoose from "mongoose";
import { getCourseQuizzes, getStudentQuizStatusMap } from "@/queries/quizv2";

/**
 * Check if user has completed the course (100%)
 * Returns: { completed: boolean, progress: number, completionDate: Date | null }
 */
export async function checkCourseCompletion(courseId, userId) {
    await dbConnect();
    
    try {
        // 1. Get course details
        const course = await Course.findById(courseId).lean();
        if (!course) {
            return { completed: false, progress: 0, completionDate: null, error: 'Course not found' };
        }
        
        // 2. Get enrollment
        const enrollment = await Enrollment.findOne({
            course: new mongoose.Types.ObjectId(courseId),
            student: new mongoose.Types.ObjectId(userId)
        }).lean();
        
        if (!enrollment) {
            return { completed: false, progress: 0, completionDate: null, error: 'Not enrolled' };
        }
        
        // 3. Get report
        const report = await Report.findOne({
            course: new mongoose.Types.ObjectId(courseId),
            student: new mongoose.Types.ObjectId(userId)
        }).lean();
        
        if (!report) {
            return { completed: false, progress: 0, completionDate: null };
        }
        
        // 4. Calculate progress
        const totalModules = course.modules?.length || 0;
        const completedModules = report.totalCompletedModules?.length || 0;
        const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

        // 5. Check required quizzes
        const allQuizzes = await getCourseQuizzes(courseId, {
            forStudent: false,
            includeUnpublished: false
        });
        const courseRequiredQuizzes = allQuizzes.filter(q => !q.lessonId && q.required);
        
        const quizStatusMap = await getStudentQuizStatusMap(courseId, userId);
        const allRequiredQuizzesPassed = courseRequiredQuizzes.every(q => {
            const qId = q.id || q._id?.toString();
            const status = quizStatusMap[qId];
            return status && status.passed;
        });

        // 6. Check completion
        // Course is complete when all modules are completed AND all required course quizzes are passed
        const isComplete = progress >= 100 && (courseRequiredQuizzes.length === 0 || allRequiredQuizzesPassed);
        
        return {
            completed: isComplete,
            progress: Math.round(progress),
            completionDate: report.completion_date || null,
            totalModules,
            completedModules,
            requiredQuizzes: {
                total: courseRequiredQuizzes.length,
                passed: courseRequiredQuizzes.filter(q => {
                    const status = quizStatusMap[q.id];
                    return status && status.passed;
                }).length
            }
        };
        
    } catch (error) {
        console.error('[CERTIFICATE] Error checking completion:', error);
        return { completed: false, progress: 0, completionDate: null, error: error.message };
    }
}

/**
 * Verify user can access certificate for course
 * Returns: { allowed: boolean, error?: string }
 */
export async function verifyCertificateAccess(courseId, userId) {
    await dbConnect();
    
    try {
        // 1. Check enrollment
        const enrollment = await Enrollment.findOne({
            course: new mongoose.Types.ObjectId(courseId),
            student: new mongoose.Types.ObjectId(userId)
        }).lean();
        
        if (!enrollment) {
            return { allowed: false, error: 'You are not enrolled in this course' };
        }
        
        // 2. Check completion
        const completionCheck = await checkCourseCompletion(courseId, userId);
        
        if (!completionCheck.completed) {
            const missingQuizzes = completionCheck.requiredQuizzes?.total - completionCheck.requiredQuizzes?.passed;
            if (missingQuizzes > 0) {
                return {
                    allowed: false,
                    error: `Complete ${missingQuizzes} required quiz${missingQuizzes > 1 ? 'zes' : ''} to unlock certificate.`
                };
            }
            return { 
                allowed: false, 
                error: `Course not completed. Progress: ${completionCheck.progress}%` 
            };
        }
        
        return { allowed: true, completionDate: completionCheck.completionDate };
        
    } catch (error) {
        console.error('[CERTIFICATE] Error verifying access:', error);
        return { allowed: false, error: 'Failed to verify certificate access' };
    }
}

