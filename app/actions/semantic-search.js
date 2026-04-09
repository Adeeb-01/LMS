"use server"

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { searchCourse } from "@/service/semantic-search";
import { semanticSearchQuerySchema } from "@/lib/validations";
import { getTranslations } from "next-intl/server";

/**
 * Server Action for semantic search.
 * @param {string} query - Natural language query
 * @param {string} courseId - Course ID to search within
 * @param {object} options - { limit, threshold }
 * @returns {Promise<object>}
 */
export async function searchCourseContent(query, courseId, options = {}) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    // Validate input
    const validated = semanticSearchQuerySchema.safeParse({ query, courseId, ...options });
    if (!validated.success) {
      throw new Error(validated.error.errors[0].message);
    }

    const results = await searchCourse(query, courseId, user, options);
    
    return {
      success: true,
      ...results
    };

  } catch (error) {
    console.error("[Search Action] Semantic Search Error:", error);
    return {
      success: false,
      error: error.message || t('somethingWentWrong')
    };
  }
}
