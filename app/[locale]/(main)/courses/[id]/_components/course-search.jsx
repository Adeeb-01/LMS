'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { searchCourseContent } from '@/app/actions/semantic-search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CourseSearch({ courseId, locale }) {
  const t = useTranslations('SemanticSearch');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || query.length < 3) {
      toast.error(t('searchPlaceholder'));
      return;
    }

    setLoading(true);
    try {
      const response = await searchCourseContent(query, courseId);
      if (response.success) {
        setResults(response.results);
        setHasSearched(true);
      } else {
        toast.error(response.error || t('errorUnavailable'));
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(t('errorUnavailable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('searching')}
            </>
          ) : (
            t('search')
          )}
        </Button>
      </form>

      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>{t('searching')}</p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-10 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">{t('noResults')}</p>
          </div>
        )}

        {!loading && results.map((result) => (
          <Card key={result.chunkId} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {result.lessonTitle}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    {result.headingPath.split(' > ').map((part, i, arr) => (
                      <span key={i} className="flex items-center">
                        {part}
                        {i < arr.length - 1 && <ChevronRight className="h-3 w-3 mx-1" />}
                      </span>
                    ))}
                  </CardDescription>
                </div>
                <div className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                  {t('score', { score: Math.round(result.score * 100) })}%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "...{result.text}..."
              </p>
              <div className="mt-4 flex justify-end">
                <Link 
                  href={`/${locale}/courses/${courseId}/lesson?lessonId=${result.lessonId}`}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {t('goToLesson')}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
