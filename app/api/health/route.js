import { NextResponse } from 'next/server';
import { checkAllServices } from '../../../lib/db/health';
import { ERROR_CODES, createApiErrorResponse } from '../../../lib/errors';

/**
 * GET /api/health
 * Public health check endpoint for monitoring database connectivity status.
 * Used by load balancers, container orchestrators, and monitoring systems.
 * 
 * Authentication: None required (public endpoint)
 * Rate Limit: 60 requests per minute per IP (should be handled by middleware)
 * 
 * @param {Request} request 
 * @returns {Promise<NextResponse>} Health status response
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('detailed') === 'true' || searchParams.get('refresh') === 'true';

    // Perform health check across all database services
    const health = await checkAllServices(force);

    // Determine HTTP status code: 200 for healthy/degraded, 503 for unhealthy
    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error(`[Health API] Unexpected error: ${error.message}`);
    
    // In case of a catastrophic error in the health check itself
    const { response } = createApiErrorResponse(
      'An internal error occurred during health check',
      500,
      ERROR_CODES.INTERNAL_ERROR,
      error.message
    );
    
    return response;
  }
}
