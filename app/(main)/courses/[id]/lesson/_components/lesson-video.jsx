"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactPlayer from "react-player/youtube";
import { AlertCircle, Loader2, VideoOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const LessonVideo = ({ courseId, lesson, module }) => {
    const [hasWindow, setHasWindow] = useState(false);
    const [started, setStarted] = useState(false);
    const [ended, setEnded] = useState(false);
    const [duration, setDuration] = useState(0);
    const [videoError, setVideoError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef(null);
    const router = useRouter();

    const isLocalVideo = useMemo(
        () => lesson.videoProvider === "local" && !!lesson.videoUrl,
        [lesson.videoProvider, lesson.videoUrl]
    );
    const videoUrl = useMemo(
        () => (isLocalVideo ? lesson.videoUrl : lesson.video_url),
        [isLocalVideo, lesson.videoUrl, lesson.video_url]
    );

    useEffect(() => {
        if (typeof window !== "undefined") setHasWindow(true);
    }, []);

    useEffect(() => {
        if (!started) return;
        let cancelled = false;
        (async () => {
            const res = await fetch("/api/lesson-watch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    lessonId: lesson.id,
                    moduleSlug: module,
                    state: "started",
                    lastTime: 0,
                }),
            });
            if (res.status === 200 && !cancelled) setStarted(false);
        })();
        return () => { cancelled = true; };
    }, [started, courseId, lesson.id, module]);

    useEffect(() => {
        if (!ended) return;
        let cancelled = false;
        (async () => {
            const res = await fetch("/api/lesson-watch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    lessonId: lesson.id,
                    moduleSlug: module,
                    state: "completed",
                    lastTime: duration,
                }),
            });
            if (res.status === 200 && !cancelled) {
                setEnded(false);
                router.refresh();
            }
        })();
        return () => { cancelled = true; };
    }, [ended, courseId, lesson.id, module, duration, router]);

    const handleOnStart = useCallback(() => setStarted(true), []);
    const handleOnEnded = useCallback(() => setEnded(true), []);
    const handleOnDuration = useCallback((dur) => setDuration(dur), []);

    const handleVideoError = useCallback(async (e) => {
        setIsLoading(false);
        const video = e.target;
        if (!video?.error) return;
        try {
            const response = await fetch(videoUrl, { method: "HEAD" });
            if (response.status === 401) {
                setVideoError({ type: "unauthorized", message: "Please login to watch this video" });
            } else if (response.status === 403) {
                setVideoError({ type: "forbidden", message: "You must be enrolled in this course to watch this video" });
            } else if (response.status === 404) {
                setVideoError({ type: "notfound", message: "Video file not found" });
            } else {
                setVideoError({ type: "error", message: "Failed to load video. Please try again." });
            }
        } catch {
            setVideoError({ type: "error", message: "Failed to load video. Please check your connection and try again." });
        }
    }, [videoUrl]);

    const handleVideoLoaded = useCallback(() => {
        setIsLoading(false);
        setVideoError(null);
    }, []);

    const handleVideoCanPlay = useCallback(() => setIsLoading(false), []);

    // No video available
    if (!videoUrl) {
        return (
            <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Alert className="max-w-md">
                    <VideoOff className="h-4 w-4" />
                    <AlertTitle>No Video Available</AlertTitle>
                    <AlertDescription>
                        No video has been uploaded for this lesson yet.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Error states
    if (videoError) {
        return (
            <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                        {videoError.type === 'unauthorized' && 'Authentication Required'}
                        {videoError.type === 'forbidden' && 'Access Denied'}
                        {videoError.type === 'notfound' && 'Video Not Found'}
                        {videoError.type === 'error' && 'Video Error'}
                    </AlertTitle>
                    <AlertDescription>
                        {videoError.message}
                    </AlertDescription>
                    {videoError.type === 'unauthorized' && (
                        <Button
                            className="mt-4"
                            onClick={() => router.push('/login')}
                        >
                            Go to Login
                        </Button>
                    )}
                    {videoError.type === 'forbidden' && (
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => router.push(`/courses/${courseId}`)}
                        >
                            View Course
                        </Button>
                    )}
                </Alert>
            </div>
        );
    }

    // Local video - use HTML5 video player for better Range support
    if (isLocalVideo && hasWindow) {
        return (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}
                <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    onError={handleVideoError}
                    onLoadedData={handleVideoLoaded}
                    onCanPlay={handleVideoCanPlay}
                    onPlay={handleOnStart}
                    onEnded={handleOnEnded}
                    onDurationChange={(e) => handleOnDuration(e.target.duration)}
                    onTimeUpdate={handleOnProgress}
                    preload="metadata"
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        );
    }

    // External video - use ReactPlayer
    if (hasWindow && videoUrl) {
        return (
            <div className="w-full">
                <ReactPlayer
                    url={videoUrl}
                    width="100%"
                    height="470px"
                    controls={true}
                    onStart={handleOnStart}
                    onDuration={handleOnDuration}
                    onProgress={handleOnProgress}
                    onEnded={handleOnEnded}
                />
            </div>
        );
    }

    // Loading state
    return (
        <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
};
