"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Pencil, PlusCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { UploadDropzone } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export const ImageForm = ({ initialData, courseId }) => {
  const router = useRouter();

  const [files, setFiles] = useState([]); // ✅ always array
  const [isEditing, setIsEditing] = useState(false);

  // ✅ don't mutate props: keep url in state
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");

  useEffect(() => {
    setImageUrl(initialData?.imageUrl || "");
  }, [initialData?.imageUrl]);

  const toggleEdit = () => {
    setIsEditing((current) => {
      const next = !current;
      if (!next) setFiles([]); // ✅ clear pending upload when closing
      return next;
    });
  };

  useEffect(() => {
    if (!files?.length || !files?.[0]) return;

 async function uploadFile() {
  try {
    const formData = new FormData();
    formData.append("files", files[0]);
    formData.append("destination", "./public/assets/images/courses");
    formData.append("courseId", courseId);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    let errorMessage = "Upload failed";
    if (!response.ok) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        const resultText = await response.text();
        errorMessage = resultText || errorMessage;
      }
      toast.error(errorMessage);
      setFiles([]);
      return;
    }

    // Use filename from API response if available
    const fileName = result.filename || 
      files?.[0]?.name ||
      files?.[0]?.path?.split?.("/").pop?.() ||
      files?.[0]?.path?.split?.("\\").pop?.();

    if (!fileName) {
      toast.error("Uploaded but file name is missing");
      setFiles([]);
      return;
    }

    // ✅ تحديث الواجهة - use path from API response or construct from filename
    const newUrl = result.path || `/assets/images/courses/${fileName}`;
    setImageUrl(newUrl);

    // ✅ حفظ الصورة في قاعدة البيانات
    const saveRes = await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnail: fileName }),
    });

    if (!saveRes.ok) {
      const msg = await saveRes.text();
      toast.error(msg || "Uploaded but failed to save course image");
      return;
    }

    toast.success("Image uploaded & saved");
    setFiles([]);
    setIsEditing(false);
    router.refresh();
  } catch (e) {
    toast.error(e?.message || "Something went wrong");
  }
}


    uploadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const safeImageUrl = imageUrl || "/assets/images/courses/default.jpg";

  return (
    <div className="mt-6 border bg-gray-50 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Course Image
        <Button variant="ghost" onClick={toggleEdit}>
          {isEditing && <>Cancel</>}
          {!isEditing && !imageUrl && (
            <>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add an image
            </>
          )}
          {!isEditing && imageUrl && (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit image
            </>
          )}
        </Button>
      </div>

      {!isEditing &&
        (!imageUrl ? (
          <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md">
            <ImageIcon className="h-10 w-10 text-slate-500" />
          </div>
        ) : (
          <div className="relative aspect-video mt-2">
            <Image
              alt="Upload"
              fill
              className="object-cover rounded-md"
              src={safeImageUrl}
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          </div>
        ))}

      {isEditing && (
        <div>
          <UploadDropzone
            onUpload={(incoming) => setFiles(Array.isArray(incoming) ? incoming : [incoming])}
          />
          <div className="text-xs text-muted-foreground mt-4">
            16:9 aspect ratio recommended
          </div>
        </div>
      )}
    </div>
  );
};
