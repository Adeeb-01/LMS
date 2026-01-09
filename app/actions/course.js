"use server"

import { getLoggedInUser } from "@/lib/loggedin-user"
import { Course } from "@/model/course-model";
import { create } from "@/queries/courses";
import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";

export async function createCourse(data){
    await dbConnect();
    try {
        const loggedinUser = await getLoggedInUser();
        if (!loggedinUser) {
            throw new Error('Unauthorized: Please log in');
        }
        data["instructor"] = loggedinUser?.id
        const course = await create(data);
        return course;
    } catch (error) {
        throw new Error(error?.message || 'Failed to create course');
    }
}
 
export async function updateCourse(courseId, dataToUpdate) {
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
        if (course.instructor.toString() !== user.id) {
            throw new Error('Forbidden: You do not have permission to update this course');
        }
        
        await Course.findByIdAndUpdate(courseId, dataToUpdate);
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
        if (course.instructor.toString() !== user.id) {
            throw new Error('Forbidden: You do not have permission to modify this course');
        }
        
        // Use atomic update to prevent race conditions
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId, 
            [{ $set: { active: { $not: "$active" } } }],
            { new: true, lean: true }
        );
        
        return updatedCourse?.active ?? false;
    } catch (error) {
        throw new Error(error?.message || 'Failed to change course publish state');
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
        
        // Cleanup related data to prevent orphaned records
        const { Module } = await import('@/model/module.model');
        const { Lesson } = await import('@/model/lesson.model');
        const { Enrollment } = await import('@/model/enrollment-model');
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
        
        // Delete enrollments and reports
        await Enrollment.deleteMany({ course: courseId });
        await Report.deleteMany({ course: courseId });
        
        // Finally delete the course
        await Course.findByIdAndDelete(courseId);  
    } catch (error) {
        throw new Error(error?.message || 'Failed to delete course');
    }
}


