"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  Form,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createCourse } from "@/app/actions/course";

import { CourseBasicInfoFields } from "./course-basic-info-fields";
import { CourseThumbnailField } from "./course-thumbnail-field";
import { CoursePricingFields } from "./course-pricing-fields";

const formSchema = z.object({
  title: z.string().min(1, {
    message: "titleRequired",
  }),
  subtitle: z.string().optional(),
  description: z.string().min(1, {
    message: "descriptionRequired",
  }),
  thumbnail: z.string().min(1, {
    message: "thumbnailRequired",
  }),
  price: z.number().min(0, {
    message: "priceRequired",
  }),
  category: z.string().min(1, {
    message: "categoryRequired",
  }),
});

/**
 * Unified course creation form component.
 * Handles initial course data collection including basic info, thumbnail, and pricing.
 * 
 * @param {Object} props
 * @param {Array} props.categories - List of available course categories
 */
export const CourseForm = ({ categories = [] }) => {
  const t = useTranslations("CourseAdd");
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      thumbnail: "",
      price: 0,
      category: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values) => {
    try {
      const course = await createCourse(values);
      router.push(`/dashboard/courses/${course?._id}`);
      toast.success(t("courseCreated"));
    } catch (error) {
      toast.error(error?.message || t("somethingWentWrong"));
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 mt-8"
      >
        <CourseBasicInfoFields form={form} isSubmitting={isSubmitting} />
        <CourseThumbnailField form={form} isSubmitting={isSubmitting} />
        <CoursePricingFields form={form} isSubmitting={isSubmitting} categories={categories} />

        <div className="flex items-center gap-x-2">
          <Link href="/dashboard/courses">
            <Button variant="outline" type="button" disabled={isSubmitting}>
              {t("cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? t("creating") : t("continue")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
