import dynamic from "next/dynamic";
import { getAdminUser } from "@/lib/admin-utils";
import {
    getEnrollmentAnalytics,
    getRevenueAnalytics,
    getTopCourses
} from "@/queries/admin";

// Lazy load analytics (tabs, cards, bar UI) — only on admin analytics route
const AnalyticsCharts = dynamic(
  () => import("./_components/analytics-charts"),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-80 rounded-lg bg-muted" />
      </div>
    ),
  }
);

export const metadata = {
    title: "Analytics - Admin",
    description: "Platform analytics and insights"
};

export default async function AnalyticsPage() {
    await getAdminUser();
    
    // Fetch analytics data directly (caching handled in queries)
    const [enrollmentData, revenueData, topCourses] = await Promise.all([
        getEnrollmentAnalytics(30),
        getRevenueAnalytics(30),
        getTopCourses(10)
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
                <p className="text-gray-600 mt-2">Platform performance metrics and trends</p>
            </div>

            <AnalyticsCharts
                enrollmentData={enrollmentData}
                revenueData={revenueData}
                topCourses={topCourses}
            />
        </div>
    );
}

