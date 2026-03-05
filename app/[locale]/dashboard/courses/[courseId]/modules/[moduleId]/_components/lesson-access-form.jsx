"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
 
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Pencil, Eye, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { updateLesson } from "@/app/actions/lesson";
import { useTranslations } from "next-intl";

const formSchema = z.object({
  isFree: z.boolean().default(false),
});

export const LessonAccessForm = ({ initialData, courseId, lessonId }) => {
  const t = useTranslations("ChapterEdit");
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const [free, setFree] = useState(initialData?.isFree);

  const toggleEdit = () => setIsEditing((current) => !current);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isFree: !!free,
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values) => {
    try {
      const payload = {};
      if (values.isFree) {
        payload["access"] = "public";
      } else {
        payload["access"] = "private";
      }
      await updateLesson(lessonId,payload);
      setFree(values.isFree); 
      toast.success(t("lessonUpdated"));
      toggleEdit();
      router.refresh();
    } catch (error) {
      toast.error(t("somethingWentWrong"));
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        {t("lessonAccess")}
        <Button variant="ghost" onClick={toggleEdit}>
          {isEditing ? (
            <>{t("cancel")}</>
          ) : (
            <>
              <Pencil className="h-4 w-4 me-2" />
              {t("editAccess")}
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <div className="flex items-center gap-x-2 mt-2">
          {free ? (
            <div className="flex items-center gap-x-2 text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md text-sm">
              <Eye className="h-4 w-4" />
              <span>{t("chapterFreePreview")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-x-2 text-slate-700 bg-slate-200 px-2 py-1 rounded-md text-sm">
              <Lock className="h-4 w-4" />
              <span>{t("chapterNotFree")}</span>
            </div>
          )}
        </div>
      )}
      {isEditing && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="isFree"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4 bg-white">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("freePreviewLabel")}
                    </FormLabel>
                    <FormDescription>
                      {t("freePreviewCheckbox")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex items-center gap-x-2">
              <Button disabled={!isValid || isSubmitting} type="submit">
                {t("save")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};
