"use server"

import { getLoggedInUser } from "@/lib/loggedin-user"
import { Course } from "@/model/course-model";
import { create } from "@/queries/courses";
import mongoose from "mongoose";

export async function createCourse(data){
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
            throw new Error('Forbidden: You do not have permission to delete this course');
        }
        
        await Course.findByIdAndDelete(courseId);  
    } catch (error) {
        throw new Error(error?.message || 'Failed to delete course');
    }
}

export async function updateQuizSetForCourse(courseId, dataUpdated){
    const data = {};
    data["quizSet"] = new mongoose.Types.ObjectId(dataUpdated.quizSetId);
    try {
        await Course.findByIdAndUpdate(courseId,data);
    } catch (error) {
        throw new Error(error?.message || 'Failed to update quiz set');
    }

}

