'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, Button, SelectWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@/components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface MetricsData {
  enabled: boolean;
  message?: string;
  from?: string;
  days?: number;
  pageViewsByPath: Array<{ path: string; count: number }>;
  avgTimeOnPageByPath: Array<{ path: string; avgTimeOnPageMs: number }>;
  sessionsSummary: { totalSessions: number; avgSessionDurationMs: number };
  deviceBreakdown: {
    byCategory: Array<{ category: string; count: number }>;
    byType: Array<{ deviceType: string; count: number }>;
  };
  consentBreakdown: Array<{ choice: string; count: number }>;
  referrerBreakdown: Array<{ referrerCategory: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
  searchQueries?: Array<{ query: string; deviceCategory: string; count: number }>;
  searchClicks?: Array<{ resultType: string; resultSlug: string; deviceCategory: string; count: number }>;
  popularSearchHidden?: Array<{ resultType: string; resultSlug: string }>;
  sessionsByDay?: Array<{ date: string; count: number }>;
  pageViewsByDay?: Array<{ date: string; count: number }>;
}

const DEVICE_COLORS = ['#3caa41', '#1d4ed8', '#e49a43', '#8B5CF6', '#EC4899'];
const CONSENT_COLORS = ['#1d4ed8', '#e49a43', '#6366F1'];
const REFERRER_COLORS = ['#3caa41', '#1d4ed8', '#e49a43', '#8B5CF6', '#EC4899'];

// Custom tooltip for line charts (light/dark mode, matches admin skateparks style)
const LineChartTooltip = ({
  active,
  payload,
  valueLabel,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string } }>;
  valueLabel: string;
}) => {
  if (!active || !payload?.length) return null;
  const dateStr = payload[0].payload?.date;
  const value = payload[0].value ?? 0;
  const label = dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : dateStr;
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
      <div className="font-semibold text-gray-900 dark:text-white mb-1">{label}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {value} {valueLabel}
      </div>
    </div>
  );
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${min}m ${s}s`;
}

export default function AdminMetricsPage() {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsData | null>(null);
  const [days, setDays] = useState('30');
  const [updatingHidden, setUpdatingHidden] = useState<string | null>(null);
  const [openGraph, setOpenGraph] = useState<'sessions' | 'pageViews' | null>(null);

  const hiddenSet = useMemo(
    () =>
      new Set(
        (data?.popularSearchHidden || []).map((h) => `${h.resultType}\0${h.resultSlug}`)
      ),
    [data?.popularSearchHidden]
  );

  const popularSearchesAggregated = useMemo(() => {
    const map = new Map<string, { resultType: string; resultSlug: string; count: number }>();
    for (const row of data?.searchClicks ?? []) {
      const key = `${row.resultType}\0${row.resultSlug}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { resultType: row.resultType, resultSlug: row.resultSlug, count: row.count });
      } else {
        cur.count += row.count;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 25);
  }, [data?.searchClicks]);

  const fetchMetrics = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/admin/metrics?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  const handleRefresh = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/admin/metrics?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      setData(json);
      toast({
        title: t('metrics.toastSuccess'),
        description: t('metrics.toastRefreshed'),
        variant: 'success',
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePopularHidden = async (
    resultType: string,
    resultSlug: string,
    currentlyHidden: boolean
  ) => {
    const key = `${resultType}\0${resultSlug}`;
    setUpdatingHidden(key);
    try {
      const current = data?.popularSearchHidden || [];
      const next = currentlyHidden
        ? current.filter((h) => h.resultType !== resultType || h.resultSlug !== resultSlug)
        : [...current, { resultType, resultSlug }];
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popularSearchHidden: next }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setData((prev) => (prev ? { ...prev, popularSearchHidden: next } : null));
      toast({
        title: t('metrics.toastSuccess'),
        description: currentlyHidden ? t('metrics.popularRestored') : t('metrics.popularRemoved'),
        variant: 'success',
      });
    } catch {
      toast({
        title: t('metrics.toastError'),
        description: t('metrics.popularUpdateFailed'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingHidden(null);
    }
  };

  if (error) {
    return (
      <div className="pt-16 space-y-6 w-full max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('metrics.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('metrics.subtitle')}
          </p>
        </div>
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-4">
            <p className="text-red dark:text-red-dark mb-4">{error}</p>
            <Button variant="secondary" onClick={() => fetchMetrics()}>{t('metrics.tryAgain')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isIlCookiePolicy = process.env.NEXT_PUBLIC_SET_IL_COOKIE_POLICY === 'true';

  return (
    <div className="pt-16 space-y-6 w-full max-w-6xl mx-auto">
      <Toaster />
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('metrics.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('metrics.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-36">
            <SelectWrapper
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={[
                { value: '7', label: t('metrics.days7') },
                { value: '30', label: t('metrics.days30') },
                { value: '90', label: t('metrics.days90') },
                { value: '365', label: t('metrics.days365') },
              ]}
            />
          </div>
          <Button
            variant="gray"
            className="flex items-center gap-1"
            onClick={handleRefresh}
            disabled={loading}
            title={t('metrics.refreshTitle')}
          >
            <svg
              className={`w-4 h-4 transition-transform ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('metrics.refresh')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {!data.enabled && (
            <Card className="border border-red-border dark:border-red-border-dark bg-red-bg dark:bg-red-bg-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-red dark:text-red-dark">
                  {data.message ?? t('metrics.disabledMessage')}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalPageViews')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data?.pageViewsByPath.reduce((s, p) => s + p.count, 0) ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.lastDays', { days: data?.days ?? Number(days) ?? 30 })}</p>
                <Button
                  variant={openGraph === 'pageViews' ? 'red' : 'purple'}
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setOpenGraph((g) => (g === 'pageViews' ? null : 'pageViews'))}
                >
                  {openGraph === 'pageViews' ? t('metrics.hideGraph') : t('metrics.viewByDay')}
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalSessions')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data?.sessionsSummary?.totalSessions ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.lastDays', { days: data?.days ?? Number(days) ?? 30 })}</p>
                <Button
                  variant={openGraph === 'sessions' ? 'red' : 'purple'}
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setOpenGraph((g) => (g === 'sessions' ? null : 'sessions'))}
                >
                  {openGraph === 'sessions' ? t('metrics.hideGraph') : t('metrics.viewByDay')}
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.avgTimeOnSite')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatDuration(data?.sessionsSummary?.avgSessionDurationMs ?? 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.perSession')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sessions per day graph (opened by button in Total sessions card) */}
          {openGraph === 'sessions' && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{t('metrics.sessionsByDayTitle')}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('metrics.sessionsByDayDescription')}</p>
                </div>
                <Button variant="gray" size="sm" onClick={() => setOpenGraph(null)}>
                  {t('metrics.close')}
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.sessionsByDay?.length ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.sessionsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-text-secondary dark:text-text-dark"
                        tickFormatter={(value) => {
                          const d = new Date(value);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-text-secondary dark:text-text-secondary-dark" />
                      <Tooltip content={<LineChartTooltip valueLabel={t('metrics.sessions')} />} />
                      <Line type="monotone" dataKey="count" stroke="#9dff00" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={t('metrics.sessions')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Page views per day graph (opened by button in Total page views card) */}
          {openGraph === 'pageViews' && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">{t('metrics.pageViewsByDayTitle')}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('metrics.pageViewsByDayDescription')}</p>
                </div>
                <Button variant="gray" size="sm" onClick={() => setOpenGraph(null)}>
                  {t('metrics.close')}
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.pageViewsByDay?.length ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.pageViewsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-text-secondary dark:text-text-dark"
                        tickFormatter={(value) => {
                          const d = new Date(value);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-text-secondary dark:text-text-secondary-dark" />
                      <Tooltip content={<LineChartTooltip valueLabel={t('metrics.views')} />} />
                      <Line type="monotone" dataKey="count" stroke="#47b84d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={t('metrics.views')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top pages & Page views chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.topPages')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.topPages?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.topPages.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
                      <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis type="category" dataKey="path" width={120} tick={{ fill: 'currentColor', fontSize: 11 }} tickFormatter={(v) => (v.length > 30 ? v.slice(0, 28) + '…' : v)} />
                      <Tooltip formatter={(value: unknown) => [Number(value), t('metrics.views')]} labelFormatter={(label: unknown) => String(label)} />
                      <Bar dataKey="count" fill="#47b84d" radius={[0, 4, 4, 0]} name={t('metrics.views')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noPageViewData')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.trafficSources')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.referrerBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.referrerBreakdown.map((r) => ({ name: t(`metrics.referrer.${r.referrerCategory}` as const), value: r.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.referrerBreakdown.map((_, i) => (
                          <Cell key={i} fill={REFERRER_COLORS[i % REFERRER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.views')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noReferrerData')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Popular searches (shown to users in header/sidebar/search page) – manage visibility */}
          <Card className="bg-card dark:bg-card-dark">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">{t('metrics.popularSearchesTitle')}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('metrics.popularSearchesDescription')}
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {popularSearchesAggregated.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('metrics.resultType')}</TableHead>
                        <TableHead>{t('metrics.path')}</TableHead>
                        <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        <TableHead className="text-right w-32">{t('metrics.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {popularSearchesAggregated.map((row) => {
                        const key = `${row.resultType}\0${row.resultSlug}`;
                        const isHidden = hiddenSet.has(key);
                        const isUpdating = updatingHidden === key;
                        return (
                          <TableRow key={key}>
                            <TableCell className="text-xs text-gray-900 dark:text-white">{row.resultType}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.resultSlug}>
                              {row.resultSlug || '—'}
                              {isHidden && (
                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">({t('metrics.hiddenFromPopular')})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant={isHidden ? 'blue' : 'red'}
                                size="sm"
                                disabled={isUpdating}
                                onClick={() => handleTogglePopularHidden(row.resultType, row.resultSlug, isHidden)}
                              >
                                {isUpdating ? t('metrics.saving') : isHidden ? t('metrics.restore') : t('metrics.remove')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSearchData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Search results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.searchQueries')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.searchQueries?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.searchQuery')}</TableHead>
                          <TableHead>{t('metrics.device')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.searchQueries.slice(0, 25).map((row, i) => (
                          <TableRow key={`${row.query}-${row.deviceCategory}-${i}`}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.query}>{row.query || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{t(`metrics.os.${row.deviceCategory}` as const)}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSearchData')}</p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.searchClicks')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.searchClicks?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.resultType')}</TableHead>
                          <TableHead>{t('metrics.path')}</TableHead>
                          <TableHead>{t('metrics.device')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.searchClicks.slice(0, 25).map((row, i) => (
                          <TableRow key={`${row.resultType}-${row.resultSlug}-${row.deviceCategory}-${i}`}>
                            <TableCell className="text-xs text-gray-900 dark:text-white">{row.resultType}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[180px]" title={row.resultSlug}>{row.resultSlug || '—'}</TableCell>
                            <TableCell className="text-xs text-gray-700 dark:text-gray-300">{t(`metrics.os.${row.deviceCategory}` as const)}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noSearchData')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Device & Consent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.devices')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.deviceBreakdown?.byCategory?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown.byCategory.map((d) => ({ name: t(`metrics.os.${d.category}` as const), value: d.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.deviceBreakdown.byCategory.map((_, i) => (
                          <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.sessions')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDeviceData')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.operatingSystem')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.deviceBreakdown?.byType?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown.byType.map((d) => ({
                          name: t(`metrics.os.${d.deviceType}` as const),
                          value: d.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.deviceBreakdown.byType.map((_, i) => (
                          <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.sessions')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noOsData')}</p>
                )}
              </CardContent>
            </Card>

            {!isIlCookiePolicy && (
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.cookieConsent')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.consentBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.consentBreakdown.map((c) => ({ name: t(`metrics.consent.${c.choice}` as const), value: c.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.consentBreakdown.map((_, i) => (
                          <Cell key={i} fill={CONSENT_COLORS[i % CONSENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.users')]} />
                      <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noConsentData')}</p>
                )}
              </CardContent>
            </Card>
            )}

            {/* IL Cookie consent: X button vs Confirm button */}
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.ilCookieConsent')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(() => {
                  const ilChoices = ['il_consent_x', 'il_consent_confirm'] as const;
                  const ilBreakdown =
                    data?.consentBreakdown?.filter((c) => ilChoices.includes(c.choice as (typeof ilChoices)[number])) ?? [];
                  if (ilBreakdown.length > 0) {
                    return (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={ilBreakdown.map((c) => ({
                              name: t(`metrics.consent.${c.choice}` as const),
                              value: c.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {ilBreakdown.map((_, i) => (
                              <Cell key={i} fill={CONSENT_COLORS[i % CONSENT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.users')]} />
                          <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                        </PieChart>
                      </ResponsiveContainer>
                    );
                  }
                  return (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {t('metrics.noConsentData')}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Users by country (from IP) */}
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.usersByCountry')}</CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('metrics.usersByCountryHint')}
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.countryBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.countryBreakdown.slice(0, 15)}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
                      <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="country"
                        width={48}
                        tick={{ fill: 'currentColor', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: unknown) => [value as React.ReactNode, t('metrics.sessions')]}
                        labelFormatter={(label: unknown) => `${t('metrics.country')}: ${String(label)}`}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name={t('metrics.sessions')} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noCountryData')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tables: Page views by path, Avg time on page */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.pageViewsByPath')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.pageViewsByPath?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.path')}</TableHead>
                          <TableHead className="text-right">{t('metrics.views')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pageViewsByPath.slice(0, 25).map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.path}>{row.path}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('metrics.avgTimeOnPage')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {data?.avgTimeOnPageByPath?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('metrics.path')}</TableHead>
                          <TableHead className="text-right">{t('metrics.avgTime')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.avgTimeOnPageByPath.slice(0, 25).map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={row.path}>{row.path}</TableCell>
                            <TableCell className="text-right text-gray-700 dark:text-gray-300">{formatDuration(row.avgTimeOnPageMs)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('metrics.noDataYet')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
