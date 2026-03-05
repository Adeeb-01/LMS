"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

export const CoursePricingFields = ({ form, isSubmitting, categories = [] }) => {
  const t = useTranslations("CourseEdit");
  const tAdd = useTranslations("CourseAdd");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("coursePrice")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                disabled={isSubmitting}
                placeholder={t("pricePlaceholder")}
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === "" ? 0 : parseFloat(value));
                }}
              />
            </FormControl>
            <FormMessage>
              {form.formState.errors.price?.message && tAdd(form.formState.errors.price.message)}
            </FormMessage>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("courseCategory")}</FormLabel>
            <Select
              disabled={isSubmitting}
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("noCategory")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage>
              {form.formState.errors.category?.message && tAdd(form.formState.errors.category.message)}
            </FormMessage>
          </FormItem>
        )}
      />
    </div>
  );
};
