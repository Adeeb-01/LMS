import mongoose from "mongoose";
import { Module } from "@/model/module.model";
import { Lesson } from "@/model/lesson.model";

/**
 * Resolves lesson + module slugs for the student lesson page deep link.
 * @param {string} courseId
 * @param {string} lessonId
 * @returns {Promise<{ lessonSlug: string, moduleSlug: string } | null>}
 */
export async function getLessonDeepLinkSlugs(courseId, lessonId) {
  if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
    return null;
  }

  const cid = new mongoose.Types.ObjectId(courseId);
  const lid = new mongoose.Types.ObjectId(lessonId);

  const [mod, lesson] = await Promise.all([
    Module.findOne({ course: cid, lessonIds: lid }).select("slug").lean(),
    Lesson.findById(lid).select("slug").lean(),
  ]);

  if (!mod?.slug || !lesson?.slug) {
    return null;
  }

  return { lessonSlug: lesson.slug, moduleSlug: mod.slug };
}
