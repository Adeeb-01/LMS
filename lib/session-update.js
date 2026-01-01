/**
 * Session Update Utilities
 * Helper functions to update NextAuth session after profile changes
 */

import { signIn } from "@/auth";

/**
 * Update session after profile changes
 * This triggers the JWT callback with trigger: "update"
 * 
 * @param {Object} sessionData - Data to update in session
 * @param {string} sessionData.name - Updated name
 * @param {string} sessionData.email - Updated email
 * @param {string} sessionData.role - Updated role
 * @param {string} sessionData.status - Updated status
 * @param {string} sessionData.image - Updated profile picture URL
 */
export async function updateSession(sessionData) {
    try {
        // Use signIn with trigger: "update" to refresh session
        await signIn("credentials", {
            redirect: false,
            // This will trigger the JWT callback with trigger: "update"
            // The actual credentials are not needed, but we need to pass something
        });
        
        // Manually update session using NextAuth's update method
        // Note: This requires the session to be updated via the update() method
        // For NextAuth v5, we use the signIn with update trigger
        if (typeof window !== 'undefined') {
            // Client-side: trigger session refresh
            const event = new Event('visibilitychange');
            window.dispatchEvent(event);
        }
    } catch (error) {
        console.error('Failed to update session:', error);
        throw error;
    }
}

/**
 * Refresh session (useful after profile picture or role changes)
 * This forces a session refresh by calling the update trigger
 */
export async function refreshSession() {
    return updateSession({});
}

