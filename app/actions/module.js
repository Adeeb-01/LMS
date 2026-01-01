"use server"

import { Course } from "@/model/course-model";
import { Module } from "@/model/module.model";
import { create } from "@/queries/modules";
import mongoose from "mongoose";
import { getLoggedInUser } from "@/lib/loggedin-user";

export async function createModule(data){
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        const title = data.get("title");
        const slug = data.get("slug");
        const courseId = data.get("courseId");
        const order = data.get("order");

        if (!title || !courseId) {
            throw new Error('Title and course ID are required');
        }

        const course = await Course.findById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        
        // Verify user owns the course
        if (course.instructor.toString() !== user.id) {
            throw new Error('Forbidden: You do not have permission to modify this course');
        }

        const createdModule = await create({title,slug, course: courseId,order});
        course.modules.push(createdModule._id);
        await course.save();

        return createdModule;
        
    } catch (error) {
        throw new Error(error?.message || 'Failed to create module');
    }
}

export async function reOrderModules(data){
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await Promise.all(data.map(async(element) => {
            await Module.findByIdAndUpdate(element.id, {order: element.position});
        }));
    } catch (error) {
        throw new Error(error?.message || 'Failed to reorder modules');
    }
}

export async function updateModule(moduleId, data) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        await Module.findByIdAndUpdate(moduleId, data);
    } catch (error) {
        throw new Error(error?.message || 'Failed to update module');
    }
}



export async function changeModulePublishState(moduleId) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        const module = await Module.findById(moduleId);
        if (!module) {
            throw new Error('Module not found');
        }
        
        const res = await Module.findByIdAndUpdate(
            moduleId, 
            [{ $set: { active: { $not: "$active" } } }],
            { new: true, lean: true }
        );
        return res?.active ?? false;

    } catch (error) {
        throw new Error(error?.message || 'Failed to change module publish state');
    }
}

export async function deleteModule(moduleId, courseId){
    try {
        const user = await getLoggedInUser();
        if (!user) {
            throw new Error('Unauthorized: Please log in');
        }
        
        const course = await Course.findById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        
        // Verify user owns the course
        if (course.instructor.toString() !== user.id) {
            throw new Error('Forbidden: You do not have permission to modify this course');
        }
        
        course.modules.pull(new mongoose.Types.ObjectId(moduleId));
        await Module.findByIdAndDelete(moduleId);
        await course.save();
    } catch (error) {
        throw new Error(error?.message || 'Failed to delete module');
    }
}
