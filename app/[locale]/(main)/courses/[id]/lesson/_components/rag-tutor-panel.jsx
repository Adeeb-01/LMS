"use client";

import { useState, useRef, useEffect } from "react";
import { AudioRecorder } from "@/components/ui/AudioRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageSquare, User, Bot, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { ReciteBackModal } from "./recite-back-modal";

export function RagTutorPanel({ lessonId, courseId, onSeek }) {
  const t = useTranslations("RagTutor");
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMethod, setInputMethod] = useState("voice"); // voice, text
  const [textInput, setTextInput] = useState("");
  const [activeReciteBack, setActiveReciteBack] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleRecordingComplete = async (blob) => {
    setError(null);
    await handleSubmit(blob, "voice");
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput;
    setTextInput("");
    setError(null);
    await handleSubmit(text, "text");
  };

  const handleRecordingError = (err) => {
    setError(err);
    setInputMethod("text");
    toast.error(t("micErrorFallback") || "Microphone error. Switching to text input.");
  };

  const handleSubmit = async (input, method) => {
    setIsSubmitting(true);
    
    // Add user message to UI immediately
    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: method === "text" ? input : "🎤 (Voice Question)",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let audioUrl = null;
      
      if (method === "voice") {
        // 1. Get presigned URL
        const fileName = `tutor-query-${lessonId}-${Date.now()}.webm`;
        const contentType = "audio/webm";
        
        const urlRes = await fetch("/api/upload/audio-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, contentType })
        });

        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { url } = await urlRes.json();

        // 2. Upload to S3
        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: input
        });

        if (!uploadRes.ok) throw new Error("Failed to upload audio");
        audioUrl = url.split('?')[0];
      }

      // 3. Query Tutor
      const response = await fetch("/api/rag-tutor/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl,
          question: method === "text" ? input : undefined,
          lessonId,
          courseId,
          inputMethod: method
        })
      });

      const data = await response.json();

      if (response.ok) {
        const botMsg = {
          id: data.result.interactionId,
          role: "bot",
          content: data.result.response,
          question: data.result.question, // Actual transcribed question
          timestampLinks: data.result.timestampLinks,
          isGrounded: data.result.isGrounded,
          reciteBackRequired: data.result.reciteBackRequired,
          timestamp: new Date()
        };
        
        // Update user message with transcription if it was voice
        if (method === "voice") {
          setMessages(prev => prev.map(m => 
            m.id === userMsg.id ? { ...m, content: data.result.question } : m
          ));
        }
        
        setMessages(prev => [...prev, botMsg]);
        
        if (data.result.rateLimitWarning) {
          toast.warning(data.result.rateLimitWarning);
        }

        // Trigger recite-back if required
        if (data.result.reciteBackRequired) {
          setActiveReciteBack({
            interactionId: data.result.interactionId,
            response: data.result.response
          });
        }
      } else {
        toast.error(data.error || "Failed to get response from tutor");
      }
    } catch (error) {
      console.error("Tutor query error:", error);
      toast.error("An error occurred while talking to the tutor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col h-[600px] shadow-xl border-primary/20 bg-background/95 backdrop-blur">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t("title") || "AI Lesson Tutor"}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">
                    {t("welcomeMessage") || "Ask me anything about this lesson!"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("welcomeSubtext") || "I'm grounded in the lecture content and can help clarify concepts."}
                  </p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`mt-1 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  
                  <div className={`flex flex-col max-w-[80%] gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none"
                    }`}>
                      {msg.content}
                      
                      {msg.role === "bot" && msg.timestampLinks?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            {t("relatedTimestamps") || "Related Timestamps:"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.timestampLinks.map((link, idx) => (
                              <Button 
                                key={idx} 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 text-[10px] gap-1 bg-background/50 hover:bg-background"
                                onClick={() => onSeek(link.seconds)}
                              >
                                <Clock className="h-3 w-3" />
                                {link.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.role === "bot" && !msg.isGrounded && (
                        <span className="ml-2 italic text-orange-500">
                          ({t("generalKnowledge") || "General Knowledge"})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
              
              {isSubmitting && (
                <div className="flex gap-3 animate-pulse">
                  <div className="mt-1 p-2 rounded-full h-8 w-8 bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-none w-12 h-10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex bg-muted p-1 rounded-lg" role="radiogroup" aria-label={t("inputMethod") || "Input Method"}>
              <Button 
                variant={inputMethod === "voice" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-xs px-3"
                onClick={() => setInputMethod("voice")}
                aria-checked={inputMethod === "voice"}
                role="radio"
              >
                🎤 {t("voice") || "Voice"}
              </Button>
              <Button 
                variant={inputMethod === "text" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-xs px-3"
                onClick={() => setInputMethod("text")}
                aria-checked={inputMethod === "text"}
                role="radio"
              >
                ⌨️ {t("text") || "Text"}
              </Button>
            </div>
          </div>

          {inputMethod === "voice" ? (
            <div className="w-full">
              <AudioRecorder 
                onRecordingComplete={handleRecordingComplete}
                onClear={() => {}}
                onError={handleRecordingError}
                compact
              />
            </div>
          ) : (
            <form onSubmit={handleTextSubmit} className="flex w-full gap-2">
              <input 
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t("askPlaceholder") || "Type your question..."}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isSubmitting}
              />
              <Button size="icon" type="submit" disabled={isSubmitting || !textInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </CardFooter>
      </Card>

      {activeReciteBack && (
        <ReciteBackModal 
          interaction={activeReciteBack}
          lessonId={lessonId}
          onComplete={() => setActiveReciteBack(null)}
          onCancel={() => setActiveReciteBack(null)}
        />
      )}
    </>
  );
}
