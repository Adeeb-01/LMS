"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileUp, Trash2, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractionStatus } from "@/components/documents/extraction-status";
import { uploadLectureDocument, replaceLectureDocument, deleteLectureDocument } from "@/app/actions/lecture-document";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Component for uploading .docx lecture documents
 * @param {string} courseId - The course ID
 * @param {string} lessonId - The lesson ID
 * @param {Object} initialData - Existing document data if any
 */
export const DocumentUpload = ({ courseId, lessonId, initialData }) => {
  const t = useTranslations("LectureDocument");
  const router = useRouter();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState(initialData?.status || null);
  const [errorMessage, setErrorMessage] = useState(initialData?.errorMessage || null);
  const [file, setFile] = useState(null);

  const onFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
        toast.error(t("invalidFile"));
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error(t("fileTooLarge"));
        return;
      }
      setFile(selectedFile);
    }
  };

  const onUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setStatus("uploading");
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("lessonId", lessonId);
      formData.append("courseId", courseId);

      let result;
      if (initialData?.id) {
        result = await replaceLectureDocument(initialData.id, formData);
      } else {
        result = await uploadLectureDocument(formData);
      }

      if (result.success) {
        toast.success(t("extractionSuccess"));
        setStatus("ready");
        setFile(null);
        router.refresh();
      } else {
        toast.error(result.error || t("extractionFailed"));
        setStatus("failed");
        setErrorMessage(result.error);
      }
    } catch (error) {
      toast.error(t("somethingWentWrong"));
      setStatus("failed");
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = async () => {
    if (!initialData?.id) return;

    try {
      setIsDeleting(true);
      const result = await deleteLectureDocument(initialData.id);

      if (result.success) {
        toast.success(t("deleted"));
        setStatus(null);
        setErrorMessage(null);
        setFile(null);
        router.refresh();
      } else {
        toast.error(result.error || t("somethingWentWrong"));
      }
    } catch (error) {
      toast.error(t("somethingWentWrong"));
    } finally {
      setIsDeleting(false);
    }
  };

  const onClear = () => {
    setFile(null);
    if (status === "failed") {
      setStatus(null);
      setErrorMessage(null);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.getElementById("docx-upload").click();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" aria-hidden="true" />
          {t("uploadTitle")}
        </CardTitle>
        <CardDescription>
          {t("uploadDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && <ExtractionStatus status={status} errorMessage={errorMessage} />}

        {(!status || status === 'failed' || (initialData && !status)) ? (
          <div className="space-y-4">
            {!file ? (
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-accent/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => document.getElementById("docx-upload").click()}
                onKeyDown={onKeyDown}
                role="button"
                tabIndex={0}
                aria-label={t("selectFile")}
              >
                <FileUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">{t("selectFile")}</p>
                <p className="text-xs text-muted-foreground">{t("dropFile")}</p>
                <input 
                  id="docx-upload" 
                  type="file" 
                  accept=".docx" 
                  className="hidden" 
                  onChange={onFileChange}
                  aria-hidden="true"
                />
              </div>
            ) : (
              <div 
                className="flex items-center justify-between p-4 border rounded-lg bg-accent/20"
                role="status"
                aria-label={`Selected file: ${file.name}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded">
                    <FileText className="h-5 w-5 text-blue-500" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={onUpload} 
                    disabled={isUploading}
                    aria-label={isUploading ? t("uploading") : t("uploadTitle")}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("uploading")}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={onClear}
                    disabled={isUploading}
                    aria-label="Clear selected file"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {status === 'ready' && (
              <div 
                className="flex items-center gap-2 p-3 bg-green-500/10 text-green-700 rounded-md text-sm"
                role="status"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span className="truncate flex-1">{initialData?.originalFilename || file?.name}</span>
                <span className="text-xs opacity-75 shrink-0">
                  ({t("wordCount", { count: initialData?.extractedText?.wordCount || 0 })})
                </span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={() => {
                  setStatus(null);
                  setFile(null);
                }}
                aria-label={t("replace")}
              >
                {t("replace")}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" aria-label={t("delete")}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteConfirmDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDelete} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      aria-label="Confirm deletion"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

