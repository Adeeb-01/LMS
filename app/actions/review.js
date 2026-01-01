"use server"

import { Course } from "@/model/course-model";
import { Testimonial } from "@/model/testimonial-model";
import { getLoggedInUser } from "@/lib/loggedin-user";
import mongoose from "mongoose";

export async function createReview(data, loginid, courseId){
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const loggedinUser = await getLoggedInUser();
        if (!loggedinUser) {
            throw new Error('Unauthorized: Please log in');
        }
        
        // Verify user can only create reviews for themselves
        if (loggedinUser.id !== loginid) {
            throw new Error('Forbidden: You can only create reviews as yourself');
        }

        const {review, rating} = data;
        
        // Validate input
        if (!review || !rating || rating < 1 || rating > 5) {
            throw new Error('Invalid review data. Rating must be between 1 and 5.');
        }

        // Create testimonial within transaction
        const newTestimonial = await Testimonial.create([{
            content: review,
            user: loginid,
            courseId,
            rating, 
        }], { session });

        if (!newTestimonial || newTestimonial.length === 0) {
            throw new Error("Failed to create testimonial");
        }

        // Update the course to include the testimonial id within transaction
        const updateCourse = await Course.findByIdAndUpdate(
            courseId,
            { $push: {testimonials: newTestimonial[0]._id }},
            { new: true, session }
        );

        if (!updateCourse) {
            throw new Error("Failed to update the course testimonial");
        }
        
        // Commit transaction
        await session.commitTransaction();
        return newTestimonial[0];
        
    } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        throw new Error(error?.message || 'Failed to create review');
    } finally {
        session.endSession();
    }
}