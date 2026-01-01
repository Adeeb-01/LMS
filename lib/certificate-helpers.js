import "server-only";
import { dbConnect } from "@/service/mongo";
import { Course } from "@/model/course-model";
import { Report } from "@/model/report-model";
import { Enrollment } from "@/model/enrollment-model";
import mongoose from "mongoose";

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
        const completedModules = report.totalCompletedModeules?.length || 0;
        const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
        
        // 5. Check completion
        // Course is complete if:
        // - All modules are completed (progress = 100%)
        // - completion_date is set
        const isComplete = progress >= 100 && report.completion_date !== null && report.completion_date !== undefined;
        
        return {
            completed: isComplete,
            progress: Math.round(progress),
            completionDate: report.completion_date || null,
            totalModules,
            completedModules
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

