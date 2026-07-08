import { auth } from "@/auth"
import { getUserByEmail } from "@/queries/users";
import { dbConnect } from "@/service/mongo";
import { NextResponse } from "next/server";

/** Use auth() as route wrapper so the session is read from this request (Auth.js v5 pattern for route handlers). */
export const GET = auth(async (request) => {
    try {
        const session = request.auth;
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        await dbConnect();
        const user = await getUserByEmail(session?.user?.email);
        
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }
        
        return NextResponse.json(user, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API /me error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } 
});