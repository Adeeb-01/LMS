"use client";

import { useState } from "react";
import { ImageIcon, PlusCircle, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { UploadDropzone } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const CourseThumbnailField = ({ form, isSubmitting }) => {
  const t = useTranslations("CourseEdit");
  const tAdd = useTranslations("CourseAdd");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const imageUrl = form.watch("thumbnail");

  const toggleEdit = () => setIsEditing((current) => !current);

  const onUpload = async (files) => {
    if (!files?.length || !files?.[0]) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", files[0]);
      formData.append("destination", "./public/assets/images/courses");
      // Note: No courseId yet during creation, API should handle this or we just get the path
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("uploadFailed"));
      }

      const newUrl = result.path || `/assets/images/courses/${result.filename}`;
      
      form.setValue("thumbnail", newUrl, { shouldValidate: true });
      toast.success(t("imageUploaded"));
      setIsEditing(false);
    } catch (error) {
      toast.error(error?.message || t("somethingWentWrong"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <FormField
      control={form.control}
      name="thumbnail"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("courseImage")}</FormLabel>
          <FormControl>
            <div className="mt-2 border bg-gray-50 rounded-md p-4">
              {!isEditing && !imageUrl && (
                <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
                  <ImageIcon className="h-10 w-10 text-slate-500" />
                </div>
              )}
              
              {!isEditing && imageUrl && (
                <div className="relative aspect-video mt-2">
                  <Image
                    alt={t("uploadAlt")}
                    fill
                    className="object-cover rounded-md"
                    src={imageUrl}
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                  <Button
                    type="button"
                    onClick={() => form.setValue("thumbnail", "")}
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {isEditing && (
                <div>
                  <UploadDropzone
                    onUpload={onUpload}
                    disabled={isUploading || isSubmitting}
                  />
                  <div className="text-xs text-muted-foreground mt-4">
                    {t("aspectRatioHint")}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleEdit}
                  disabled={isUploading || isSubmitting}
                >
                  {isEditing ? (
                    t("cancel")
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 me-2" />
                      {imageUrl ? t("editImage") : t("addImage")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </FormControl>
          <FormMessage>
            {form.formState.errors.thumbnail?.message && tAdd(form.formState.errors.thumbnail.message)}
          </FormMessage>
        </FormItem>
      )}
    />
  );
};
