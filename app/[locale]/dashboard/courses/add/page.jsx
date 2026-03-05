import { getCategories } from "@/queries/categories";
import { getTranslations } from "next-intl/server";
import { CourseForm } from "./_components/course-form";

const AddCourse = async () => {
  const categories = await getCategories();
  const t = await getTranslations("CourseAdd");

  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-full p-6">
      <div className="max-w-full w-[600px]">
        <h1 className="text-2xl font-medium">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-slate-600">
          {t("pageDescription")}
        </p>
        <CourseForm categories={categories} />
      </div>
    </div>
  );
};

export default AddCourse;
