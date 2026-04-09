import { NextResponse } from 'next/server';
import { dbConnect } from '@/service/mongo';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { searchCourse } from '@/service/semantic-search';
import { semanticSearchQuerySchema } from '@/lib/validations';

/**
 * POST /api/semantic-search
 * Perform semantic search across course content.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json({ 
        error: 'UNAUTHORIZED', 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const body = await req.json();
    const validated = semanticSearchQuerySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ 
        error: 'VALIDATION_ERROR', 
        message: validated.error.errors[0].message,
        field: validated.error.errors[0].path[0]
      }, { status: 400 });
    }

    const { query, courseId, limit, threshold } = body;
    
    try {
      const results = await searchCourse(query, courseId, user, { limit, threshold });
      return NextResponse.json(results, { status: 200 });
    } catch (searchError) {
      if (searchError.message === 'You are not enrolled in this course') {
        return NextResponse.json({ 
          error: 'FORBIDDEN', 
          message: searchError.message 
        }, { status: 403 });
      }
      
      console.error("[Search API] Error:", searchError);
      return NextResponse.json({ 
        error: 'INTERNAL_ERROR', 
        message: searchError.message 
      }, { status: 500 });
    }

  } catch (err) {
    console.error("[Search API] Unexpected error:", err);
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR', 
      message: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
