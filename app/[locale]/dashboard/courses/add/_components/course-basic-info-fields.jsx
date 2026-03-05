"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

export const CourseBasicInfoFields = ({ form, isSubmitting }) => {
  const t = useTranslations("CourseAdd");

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("courseTitle")}</FormLabel>
            <FormControl>
              <Input
                disabled={isSubmitting}
                placeholder={t("titlePlaceholder")}
                {...field}
              />
            </FormControl>
            <FormMessage>
              {form.formState.errors.title?.message && t(form.formState.errors.title.message)}
            </FormMessage>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="subtitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("courseSubtitle")}</FormLabel>
            <FormControl>
              <Input
                disabled={isSubmitting}
                placeholder={t("subtitlePlaceholder")}
                {...field}
              />
            </FormControl>
            <FormMessage>
              {form.formState.errors.subtitle?.message && t(form.formState.errors.subtitle.message)}
            </FormMessage>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("courseDescription")}</FormLabel>
            <FormControl>
              <Textarea
                disabled={isSubmitting}
                placeholder={t("descriptionPlaceholder")}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t("descriptionHint")}
            </FormDescription>
            <FormMessage>
              {form.formState.errors.description?.message && t(form.formState.errors.description.message)}
            </FormMessage>
          </FormItem>
        )}
      />
    </div>
  );
};
