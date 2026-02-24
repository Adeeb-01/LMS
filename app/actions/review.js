"use server"

import { Course } from "@/model/course-model";
import { Testimonial } from "@/model/testimonial-model";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { reviewSchema } from "@/lib/validations";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import mongoose from "mongoose";
import { dbConnect } from "@/service/mongo";

/**
 * Create a review for a course. BOLA: user must be self (loginid). State: user must be enrolled.
 */
export async function createReview(data, loginid, courseId) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const loggedinUser = await getLoggedInUser();
        if (!loggedinUser) {
            throw new Error('Unauthorized: Please log in');
        }

        // BOLA: user can only create reviews as themselves (reject IDOR)
        if (loggedinUser.id !== loginid) {
            throw new Error('Forbidden: You can only create reviews as yourself');
        }

        // Mass assignment: only allow review + rating
        const parsed = reviewSchema.safeParse(data);
        if (!parsed.success) {
            throw new Error('Invalid review data. Rating must be between 1 and 5.');
        }
        const { review, rating } = parsed.data;

        // State transition: only enrolled students can leave a review
        const isEnrolled = await hasEnrollmentForCourse(courseId, loggedinUser.id);
        if (!isEnrolled) {
            throw new Error('You must be enrolled in this course to leave a review');
        }

        // Course must exist and be the one requested
        const course = await Course.findById(courseId).select('_id').session(session);
        if (!course) {
            throw new Error('Course not found');
        }

        const newTestimonial = await Testimonial.create([{
            content: review,
            user: loginid,
            courseId,
            rating,
        }], { session });

        if (!newTestimonial || newTestimonial.length === 0) {
            throw new Error("Failed to create testimonial");
        }

        const updateCourse = await Course.findByIdAndUpdate(
            courseId,
            { $push: { testimonials: newTestimonial[0]._id } },
            { new: true, session }
        );

        if (!updateCourse) {
            throw new Error("Failed to update the course testimonial");
        }

        await session.commitTransaction();
        return newTestimonial[0];
    } catch (error) {
        await session.abortTransaction();
        throw new Error(error?.message || 'Failed to create review');
    } finally {
        session.endSession();
    }
}