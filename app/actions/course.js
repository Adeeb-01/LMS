"use server"

import { getLoggedInUser } from "@/lib/loggedin-user";
import { Course } from "@/model/course-model";
import { create } from "@/queries/courses";
import { courseSchema } from "@/lib/validations";
import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";

/** Mass assignment: only allow title, subtitle, description, price, category, thumbnail. Instructor set server-side. */
export async function createCourse(data) {
    await dbConnect();
    try {
        const loggedinUser = await getLoggedInUser();
        if (!loggedinUser) {
            throw new Error('Unauthorized: Please log in');
        }
        const parsed = courseSchema.safeParse(data);
        if (!parsed.success) {
            const errorMessages = parsed.error.errors.map(err => err.message).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
        }
        const courseData = { ...parsed.data, instructor: loggedinUser.id };
        const course = await create(courseData);
        return course;
    } catch (error) {
        throw new Error(error?.message || 'Failed to create course');
    }
}

/** BOLA: only course owner can update. Mass assignment: only whitelisted fields. */
export async function updateCourse(courseId, dataToUpdate) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        const course = await Course.findById(courseId).select('instructor').lean();
        if (!course) {
            throw new Error('Course not found');
        }
        if (course.instructor.toString() !== user.id) {
            throw new Error('Forbidden: You do not have permission to update this course');
        }
        const updateSchema = courseSchema.partial().strict();
        const parsed = updateSchema.safeParse(dataToUpdate);
        if (!parsed.success) {
            throw new Error('Validation failed for course update');
        }
        const allowed = parsed.data;
        if (Object.keys(allowed).length === 0) return;
        await Course.findByIdAndUpdate(courseId, { $set: allowed }, { runValidators: true });
    } catch (error) {
        throw new Error(error?.message || 'Failed to update course');
    }
}


export async function changeCoursePublishState(courseId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        const course = await Course.findById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        
        // Check if user is the instructor
        const { assertInstructorOwnsCourse, isAdmin } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(courseId, user.id, { allowAdmin: isAdmin(user) });
        
        // If we are publishing (currently inactive), validate requirements
        if (!course.active) {
            const { Module } = await import('@/model/module.model');
            const modules = await Module.find({ course: courseId }).select('lessonIds').lean();
            
            const { validatePublishRequirements } = await import('@/lib/validations');
            const validation = validatePublishRequirements({ ...course.toObject(), modules });
            
            if (!validation.isValid) {
                return { 
                    success: false, 
                    canPublish: false, 
                    missing: validation.errors 
                };
            }
        }
        
        // Use atomic update to prevent race conditions
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId, 
            [{ $set: { active: { $not: "$active" } } }],
            { new: true, lean: true }
        );
        
        return { success: true, active: updatedCourse?.active ?? false };
    } catch (error) {
        throw new Error(error?.message || 'Failed to change course publish state');
    }
}

export async function validatePublishRequirementsAction(courseId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        // Use centralized authorization check
        const { assertInstructorOwnsCourse, isAdmin } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(courseId, user.id, { allowAdmin: isAdmin(user) });
        
        const course = await Course.findById(courseId).lean();
        if (!course) {
            throw new Error('Course not found');
        }
        
        const { Module } = await import('@/model/module.model');
        const modules = await Module.find({ course: courseId }).select('lessonIds').lean();
        
        const { validatePublishRequirements } = await import('@/lib/validations');
        const validation = validatePublishRequirements({ ...course, modules });
        
        const lessonCount = modules.reduce((acc, m) => acc + (m.lessonIds?.length || 0), 0);
        
        return {
            canPublish: validation.isValid,
            missing: validation.errors,
            stats: {
                moduleCount: modules.length,
                lessonCount
            }
        };
    } catch (error) {
        throw new Error(error?.message || 'Failed to validate publish requirements');
    }
}

export async function restoreCourse(courseId) {
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        const { isAdmin } = await import('@/lib/authorization');
        if (!isAdmin(user)) {
            throw new Error('Forbidden: Admin access required');
        }
        
        const course = await Course.findById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        
        if (!course.deletedAt) {
            throw new Error('Course is not soft-deleted');
        }
        
        await Course.findByIdAndUpdate(courseId, {
            $set: {
                deletedAt: null,
                deletedBy: null
            }
        });
        
        return { success: true };
    } catch (error) {
        throw new Error(error?.message || 'Failed to restore course');
    }
}

export async function deleteCourse(courseId){
    await dbConnect();
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        // Use centralized authorization check
        const { assertInstructorOwnsCourse, isAdmin } = await import('@/lib/authorization');
        await assertInstructorOwnsCourse(courseId, user.id, { allowAdmin: isAdmin(user) });
        
        const { Enrollment } = await import('@/model/enrollment-model');
        
        // Check if enrollments exist
        const hasEnrollments = await Enrollment.exists({ course: courseId });
        
        if (hasEnrollments) {
            // Perform soft-delete
            await Course.findByIdAndUpdate(courseId, {
                $set: {
                    deletedAt: new Date(),
                    deletedBy: user.id,
                    active: false // Unpublish when soft-deleted
                }
            });
            return { success: true, softDeleted: true };
        }
        
        // Cleanup related data to prevent orphaned records (Hard delete)
        const { Module } = await import('@/model/module.model');
        const { Lesson } = await import('@/model/lesson.model');
        const { Report } = await import('@/model/report-model');
        
        // Get modules for this course
        const modules = await Module.find({ course: courseId }).select('_id lessonIds').lean();
        const moduleIds = modules.map(m => m._id);
        const lessonIds = modules.flatMap(m => m.lessonIds || []).map(id => id.toString());
        
        // Delete lessons (and their video files if needed - handled by lesson model hooks if any)
        if (lessonIds.length > 0) {
            await Lesson.deleteMany({ _id: { $in: lessonIds.map(id => new mongoose.Types.ObjectId(id)) } });
        }
        
        // Delete modules
        if (moduleIds.length > 0) {
            await Module.deleteMany({ _id: { $in: moduleIds } });
        }
        
        // Delete reports (enrollments already checked to be zero)
        await Report.deleteMany({ course: courseId });
        
        // Finally delete the course
        await Course.findByIdAndDelete(courseId);  
        return { success: true, softDeleted: false };
    } catch (error) {
        throw new Error(error?.message || 'Failed to delete course');
    }
}


