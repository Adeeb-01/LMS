import { getAdminUser } from "@/lib/admin-utils";
import { unstable_cache } from "next/cache";
import ReviewsTable from "./_components/reviews-table";
import { getTranslations } from "next-intl/server";
import { dbConnect } from "@/service/mongo";
import { Testimonial } from "@/model/testimonial-model";
import { replaceMongoIdInArray } from "@/lib/convertData";

const getCachedReviews = unstable_cache(
    async () => {
        await dbConnect();
        const reviews = await Testimonial.find()
            .populate({
                path: 'user',
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'courseId',
                select: 'title'
            })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        return replaceMongoIdInArray(reviews);
    },
    ['admin-reviews'],
    { revalidate: 120 }
);

export const metadata = {
    title: "Reviews Management - Admin",
    description: "Manage course reviews and testimonials"
};

export default async function ReviewsPage() {
    await getAdminUser();
    const t = await getTranslations("Admin");
    const reviews = await getCachedReviews();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{t("reviewsManagement")}</h1>
                <p className="text-gray-600 mt-2">{t("manageReviewsSub")}</p>
            </div>

            <ReviewsTable reviews={reviews || []} />
        </div>
    );
}

