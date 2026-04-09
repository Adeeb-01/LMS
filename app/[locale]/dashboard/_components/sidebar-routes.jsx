"use client";

import { BarChart } from "lucide-react";
import { BookMarked } from "lucide-react";
import { BookOpen } from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { useTranslations } from "next-intl";

const ROUTES = [
  { icon: BarChart, labelKey: "analytics", href: "/dashboard" },
  { icon: BookOpen, labelKey: "courses", href: "/dashboard/courses" },
  { icon: BookMarked, labelKey: "remediation", href: "/dashboard/remediation" },
  { icon: BookOpen, labelKey: "addCourse", href: "/dashboard/courses/add" },
  // {
  //   icon: Radio,
  //   label: "Lives",
  //   href: "/dashboard/lives",
  // },
];

export const SidebarRoutes = () => {
  const t = useTranslations("Dashboard");
  return (
    <div className="flex flex-col w-full">
      {ROUTES.map((route) => (
        <SidebarItem
          key={route.href}
          icon={route.icon}
          label={t(route.labelKey)}
          href={route.href}
        />
      ))}
    </div>
  );
};
