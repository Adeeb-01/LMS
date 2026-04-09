"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactPlayer from "react-player/youtube";
import { AlertCircle, Loader2, VideoOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVideoSync } from "../_components/video-text-sync";
import { OralAssessmentPanel } from "./oral-assessment-panel";
import { RagTutorPanel } from "./rag-tutor-panel";
import { AssessmentSkeleton, TutorSkeleton } from "@/components/assessment/assessment-skeleton";
import { getAssessmentPoints } from "@/app/actions/oral-assessment";
import { MessageSquare, X } from "lucide-react";

export const LessonVideo = ({ courseId, lesson, module }) => {
    const t = useTranslations("Lesson");
    const [hasWindow, setHasWindow] = useState(false);
    const [started, setStarted] = useState(false);
    const [ended, setEnded] = useState(false);
    const [duration, setDuration] = useState(0);
    const [videoError, setVideoError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { handleTimeUpdate, videoRef, seekTo } = useVideoSync();
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- Oral Assessment & RAG Tutor State ---
    const [assessments, setAssessments] = useState([]);
    const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(true);
    const [activeAssessment, setActiveAssessment] = useState(null);
    const [completedAssessments, setCompletedAssessments] = useState(new Set());
    const [isTutorOpen, setIsTutorOpen] = useState(false);
    const lastTriggeredRef = useRef(-1);

    const toggleTutor = () => {
        setIsTutorOpen(prev => !prev);
        if (!isTutorOpen && videoRef.current) {
            // Pause video when opening tutor
            pauseVideo();
        }
    };

    const pauseVideo = () => {
        if (videoRef.current) {
            if (typeof videoRef.current.pause === 'function') {
                videoRef.current.pause();
            } else if (videoRef.current.getInternalPlayer) {
                const internal = videoRef.current.getInternalPlayer();
                if (internal?.pauseVideo) internal.pauseVideo();
                else if (internal?.pause) internal.pause();
            }
        }
    };

    const playVideo = () => {
        if (videoRef.current) {
            if (typeof videoRef.current.play === 'function') {
                videoRef.current.play();
            } else if (videoRef.current.getInternalPlayer) {
                const internal = videoRef.current.getInternalPlayer();
                if (internal?.playVideo) internal.playVideo();
                else if (internal?.play) internal.play();
            }
        }
    };

    // Fetch assessment points on mount
    useEffect(() => {
        const fetchAssessments = async () => {
            setIsAssessmentsLoading(true);
            try {
                const result = await getAssessmentPoints(lesson.id);
                if (result.ok) {
                    setAssessments(result.assessments);
                }
            } finally {
                setIsAssessmentsLoading(false);
            }
        };
        fetchAssessments();
    }, [lesson.id]);

    // Check for assessment triggers
    const checkAssessmentTrigger = useCallback((currentTime) => {
        if (activeAssessment) return;

        const trigger = assessments.find(a => 
            !completedAssessments.has(a.id) && 
            currentTime >= a.triggerTimestamp && 
            currentTime < a.triggerTimestamp + 2 && // 2-second window
            a.id !== lastTriggeredRef.current
        );

        if (trigger) {
            lastTriggeredRef.current = trigger.id;
            setActiveAssessment(trigger);
            
            // Pause video
            pauseVideo();
        }
    }, [assessments, completedAssessments, activeAssessment, videoRef]);

    const handleAssessmentComplete = () => {
        setCompletedAssessments(prev => new Set([...prev, activeAssessment.id]));
        setActiveAssessment(null);
        
        // Resume video
        playVideo();
    };

    const handleAssessmentCancel = () => {
        setCompletedAssessments(prev => new Set([...prev, activeAssessment.id]));
        setActiveAssessment(null);
        
        // Resume video
        playVideo();
    };
    // -----------------------------

    // Handle initial seek from URL param 't'
    useEffect(() => {
        const tParam = searchParams.get('t');
        if (tParam && !isLoading && videoRef.current) {
            const seconds = parseInt(tParam, 10);
            if (!isNaN(seconds)) {
                // Delay slightly to ensure player is ready
                const timeout = setTimeout(() => {
                    if (typeof videoRef.current.seekTo === 'function') {
                        videoRef.current.seekTo(seconds);
                    } else if (videoRef.current.currentTime !== undefined) {
                        videoRef.current.currentTime = seconds;
                    }
                }, 500);
                return () => clearTimeout(timeout);
            }
        }
    }, [searchParams, isLoading, videoRef]);

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
            try {
                const res = await fetch("/api/lesson-watch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        courseId,
                        lessonId: lesson.id,
                        moduleSlug: module,
                        state: "completed",
                        lastTime: duration,
                    }),
                });
                const ok = res.status === 200;
                console.log("[lesson-video] completion API response:", res.status, "lessonId:", lesson.id);
                if (!cancelled && ok) {
                    console.log("[lesson-video] calling router.refresh()");
                    router.refresh();
                }
            } finally {
                if (!cancelled) setEnded(false);
            }
        })();
        return () => { cancelled = true; };
    }, [ended, courseId, lesson.id, module, duration, router]);

    const handleOnStart = useCallback(() => setStarted(true), []);
    const handleOnEnded = useCallback(() => setEnded(true), []);
    const handleOnDuration = useCallback((dur) => setDuration(dur), []);
    const handleOnProgress = useCallback((progress) => {
        // progress can be { playedSeconds, ... } from ReactPlayer
        // or just the time from HTML5 video element
        const currentTime = typeof progress === 'number' ? progress : progress.playedSeconds;
        handleTimeUpdate(currentTime);
        checkAssessmentTrigger(currentTime);
    }, [handleTimeUpdate, checkAssessmentTrigger]);

    const handleVideoError = useCallback(async (e) => {
        setIsLoading(false);
        const video = e.target;
        if (!video?.error) return;
        try {
            const response = await fetch(videoUrl, { method: "HEAD" });
            if (response.status === 401) {
                setVideoError({ type: "unauthorized", message: t("pleaseLoginToWatch") });
            } else if (response.status === 403) {
                setVideoError({ type: "forbidden", message: t("mustBeEnrolled") });
            } else if (response.status === 404) {
                setVideoError({ type: "notfound", message: t("videoFileNotFound") });
            } else {
                setVideoError({ type: "error", message: t("failedToLoadVideo") });
            }
        } catch {
            setVideoError({ type: "error", message: t("failedToLoadVideoConnection") });
        }
    }, [videoUrl, t]);

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
                    <AlertTitle>{t("noVideoAvailable")}</AlertTitle>
                    <AlertDescription>
                        {t("noVideoUploaded")}
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
                        {videoError.type === 'unauthorized' && t("authRequired")}
                        {videoError.type === 'forbidden' && t("accessDenied")}
                        {videoError.type === 'notfound' && t("videoNotFound")}
                        {videoError.type === 'error' && t("videoError")}
                    </AlertTitle>
                    <AlertDescription>
                        {videoError.message}
                    </AlertDescription>
                    {videoError.type === 'unauthorized' && (
                        <Button
                            className="mt-4"
                            onClick={() => router.push('/login')}
                        >
                            {t("goToLogin")}
                        </Button>
                    )}
                    {videoError.type === 'forbidden' && (
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => router.push(`/courses/${courseId}`)}
                        >
                            {t("viewCourse")}
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
                
                {activeAssessment && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 p-4 overflow-y-auto">
                        {isAssessmentsLoading ? (
                            <AssessmentSkeleton />
                        ) : (
                            <OralAssessmentPanel 
                                assessment={activeAssessment}
                                lessonId={lesson.id}
                                courseId={courseId}
                                onComplete={handleAssessmentComplete}
                                onCancel={handleAssessmentCancel}
                            />
                        )}
                    </div>
                )}

                {isTutorOpen && (
                    <div className="absolute top-4 right-4 z-20 w-80 md:w-96 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="relative">
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow-lg z-30"
                                onClick={() => setIsTutorOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            <RagTutorPanel 
                                lessonId={lesson.id}
                                courseId={courseId}
                                onSeek={(seconds) => seekTo(seconds)}
                                onReciteBackTrigger={(interactionId, explanation) => {
                                    // US3: Trigger recite-back modal
                                    console.log("Recite back triggered", interactionId);
                                }}
                            />
                        </div>
                    </div>
                )}

                {!isTutorOpen && !activeAssessment && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-16 right-4 z-20 gap-2 shadow-lg bg-background/80 backdrop-blur hover:bg-background"
                        onClick={toggleTutor}
                    >
                        <MessageSquare className="h-4 w-4" />
                        {t("askTutor") || "Ask Tutor"}
                    </Button>
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
                    onTimeUpdate={(e) => handleOnProgress(e.target.currentTime)}
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
            <div className="relative w-full">
                {activeAssessment && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 p-4 overflow-y-auto">
                        {isAssessmentsLoading ? (
                            <AssessmentSkeleton />
                        ) : (
                            <OralAssessmentPanel 
                                assessment={activeAssessment}
                                lessonId={lesson.id}
                                courseId={courseId}
                                onComplete={handleAssessmentComplete}
                                onCancel={handleAssessmentCancel}
                            />
                        )}
                    </div>
                )}

                {isTutorOpen && (
                    <div className="absolute top-4 right-4 z-20 w-80 md:w-96 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="relative">
                            <Button 
                                variant="secondary" 
                                size="icon" 
                                className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow-lg z-30"
                                onClick={() => setIsTutorOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            <RagTutorPanel 
                                lessonId={lesson.id}
                                courseId={courseId}
                                onSeek={(seconds) => seekTo(seconds)}
                                onReciteBackTrigger={(interactionId, explanation) => {
                                    // US3: Trigger recite-back modal
                                    console.log("Recite back triggered", interactionId);
                                }}
                            />
                        </div>
                    </div>
                )}

                {!isTutorOpen && !activeAssessment && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-16 right-4 z-20 gap-2 shadow-lg bg-background/80 backdrop-blur hover:bg-background"
                        onClick={toggleTutor}
                    >
                        <MessageSquare className="h-4 w-4" />
                        {t("askTutor") || "Ask Tutor"}
                    </Button>
                )}
                
                <ReactPlayer
                    ref={videoRef}
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
