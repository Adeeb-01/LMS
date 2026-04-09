import { getTranslations } from "next-intl/server";
import { getClassWeaknessAggregation } from "@/app/actions/remediation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Anonymized class-level weakness snapshot for instructors (course edit page).
 */
export async function ClassWeaknessAnalytics({ courseId }) {
  const t = await getTranslations("Remediation");
  const result = await getClassWeaknessAggregation({ courseId, limit: 20 });

  if (!result.success) {
    return (
      <Card className="mt-10">
        <CardHeader>
          <CardTitle>{t("instructorAnalyticsTitle")}</CardTitle>
          <CardDescription>{t("instructorAnalyticsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" role="alert">
            {result.error?.message || t("errorLoad")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data } = result;
  const concepts = data.concepts ?? [];

  return (
    <Card className="mt-10">
      <CardHeader>
        <CardTitle>{t("instructorAnalyticsTitle")}</CardTitle>
        <CardDescription>{t("instructorAnalyticsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            {t("instructorStudentsEnrolled")}: <strong className="text-foreground">{data.totalStudents}</strong>
          </span>
          <span>
            {t("instructorStudentsWithWeaknesses")}:{" "}
            <strong className="text-foreground">{data.totalWithWeaknesses}</strong>
          </span>
          <span className="text-xs">
            {t("instructorGeneratedAt")}: {new Date(data.generatedAt).toLocaleString()}
          </span>
        </div>

        {concepts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("instructorNoConceptData")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("instructorConceptColumn")}</TableHead>
                <TableHead scope="col" className="text-end">
                  {t("instructorAffectedStudentsColumn")}
                </TableHead>
                <TableHead scope="col" className="text-end">
                  {t("instructorOccurrencesColumn")}
                </TableHead>
                <TableHead scope="col" className="text-end">
                  {t("instructorAvgPriorityColumn")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concepts.map((row) => (
                <TableRow key={row.conceptTag}>
                  <TableCell className="font-medium">{row.conceptTag}</TableCell>
                  <TableCell className="text-end tabular-nums">{row.affectedStudents}</TableCell>
                  <TableCell className="text-end tabular-nums">{row.totalOccurrences}</TableCell>
                  <TableCell className="text-end tabular-nums">{row.avgPriority}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
