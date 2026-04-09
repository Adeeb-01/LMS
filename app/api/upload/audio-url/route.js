import { NextResponse } from "next/server";
import { getPresignedUploadUrl } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";

import { getLoggedInUser } from "@/lib/loggedin-user";

export async function POST(req) {
    try {
        const user = await getLoggedInUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fileName, contentType } = await req.json();

        if (!fileName || !contentType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const data = await getPresignedUploadUrl(fileName, contentType);

        return NextResponse.json(data);
    } catch (error) {
        console.error("[UPLOAD_AUDIO_URL_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
