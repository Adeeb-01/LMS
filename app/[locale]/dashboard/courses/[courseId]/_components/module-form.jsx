"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem, 
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ModuleList } from "./module-list";
import { getSlug } from "@/lib/convertData";
import { createModule, reOrderModules, deleteModule } from "@/app/actions/module";
import { useTranslations } from "next-intl";
import { ModuleDeleteDialog } from "./module-delete-dialog";

const formSchema = z.object({
  title: z.string().min(1),
});
// const initialModules = [
//   {
//     id: "1",
//     title: "Module 1",
//     isPublished: true,
//   },
//   {
//     id: "2",
//     title: "Module 2",
//   },
// ];
export const ModulesForm = ({ initialData, courseId }) => {
  const t = useTranslations("CourseEdit");
  const tChapter = useTranslations("ChapterEdit");
  const [modules, setModules] = useState(initialData);
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const toggleCreating = () => setIsCreating((current) => !current);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values) => {
    try {

      const formData = new FormData();
      formData.append("title", values?.title);
      formData.append("slug", getSlug(values?.title));
      formData.append("courseId",courseId);
      formData.append("order", modules.length)

      const createdModule = await createModule(formData); 

      setModules((modules) => [
        ...modules,
        {
          id: createdModule?.id,
          title: values.title,
          active: false,
          lessonIds: [],
        },
      ]);
      toast.success(t("moduleCreated"));
      toggleCreating();
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(t("somethingWentWrong"));
    }
  }; 

  const onReorder = async (updateData) => {
    try {
      setIsUpdating(true);
      await reOrderModules(updateData);
      toast.success(t("chaptersReordered"));
      router.refresh();
    } catch {
      toast.error(t("somethingWentWrong"));
    } finally {
      setIsUpdating(false);
    }
  };

  const onEdit = (id) => {
    router.push(`/dashboard/courses/${courseId}/modules/${id}`);
  };

  const onDelete = (id) => {
    setDeletingId(id);
  };

  const onConfirmDelete = async () => {
    try {
      setIsUpdating(true);
      await deleteModule(deletingId, courseId);
      setModules((current) => current.filter((m) => m.id !== deletingId));
      toast.success(tChapter("moduleDeleted"));
      router.refresh();
    } catch (error) {
      toast.error(t("somethingWentWrong"));
    } finally {
      setIsUpdating(false);
      setDeletingId(null);
    }
  };

  const deletingModule = modules.find((m) => m.id === deletingId);

  return (
    <div className="relative mt-6 border bg-slate-100 rounded-md p-4">
      <ModuleDeleteDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={onConfirmDelete}
        lessonCount={deletingModule?.lessonIds?.length || 0}
      />
      {isUpdating && (
        <div className="absolute h-full w-full bg-gray-500/20 inset-0 rounded-md flex items-center justify-center">
          <Loader2 className="animate-spin h-6 w-6 text-sky-700" />
        </div>
      )}
      <div className="font-medium flex items-center justify-between">
        {t("courseModules")}
        <Button variant="ghost" onClick={toggleCreating}>
          {isCreating ? (
            <>{t("cancel")}</>
          ) : (
            <>
              <PlusCircle className="h-4 w-4 me-2" />
              {t("addModule")}
            </>
          )}
        </Button>
      </div>

      {isCreating && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder={t("modulePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={!isValid || isSubmitting} type="submit">
              {t("create")}
            </Button>
          </form>
        </Form>
      )}
      {!isCreating && (
        <div
          className={cn(
            "text-sm mt-2",
            !modules?.length && "text-slate-500 italic"
          )}
        >
          {!modules?.length && t("noModule")}
          <ModuleList
            onEdit={onEdit}
            onReorder={onReorder}
            onDelete={onDelete}
            items={modules || []}
          />
        </div>
      )}
      {!isCreating && (
        <p className="text-xs text-muted-foreground mt-4">
          {t("dragDropReorder")}
        </p>
      )}
    </div>
  );
};
