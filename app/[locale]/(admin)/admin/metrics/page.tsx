'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
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
  topPages: Array<{ path: string; count: number }>;
}

const DEVICE_COLORS = ['#3caa41', '#1d4ed8', '#e49a43', '#8B5CF6', '#EC4899'];
const CONSENT_COLORS = ['#1d4ed8', '#e49a43', '#6366F1'];
const REFERRER_COLORS = ['#3caa41', '#1d4ed8', '#e49a43', '#8B5CF6', '#EC4899'];

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
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsData | null>(null);
  const [days, setDays] = useState('30');
  const [showAdminMetrics, setShowAdminMetrics] = useState(false);
  const [adminMetricsData, setAdminMetricsData] = useState<MetricsData | null>(null);
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  const fetchMetrics = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/admin/metrics?days=${days}&excludeAdmins=true`);
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

  const fetchAdminMetrics = async () => {
    try {
      setAdminMetricsLoading(true);
      const res = await fetch(`/api/admin/metrics?days=${days}&user=admins`);
      if (!res.ok) throw new Error('Failed to fetch admin metrics');
      const json = await res.json();
      setAdminMetricsData(json);
    } catch {
      setAdminMetricsData(null);
    } finally {
      setAdminMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (showAdminMetrics && isAdmin) {
      fetchAdminMetrics();
    }
  }, [showAdminMetrics, days, isAdmin]);

  const handleRefresh = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`/api/admin/metrics?days=${days}&excludeAdmins=true`);
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

  const disabled = !data?.enabled;

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

      {/* Admin metrics (admin only, show when clicked) */}
      {isAdmin && (
        <Card className="bg-card dark:bg-card-dark">
          <button
            type="button"
            onClick={() => setShowAdminMetrics((v) => !v)}
            className="w-full text-left p-4 flex items-center justify-between gap-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{t('metrics.adminMetrics')}</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('metrics.adminMetricsDescription')}</p>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
              {showAdminMetrics ? t('metrics.hideAdminMetrics') : t('metrics.showAdminMetrics')}
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAdminMetrics ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAdminMetrics && (
            <CardContent className="pt-0 pb-4 border-t border-border dark:border-border-dark">
              {adminMetricsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : adminMetricsData?.enabled ? (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/50 dark:bg-muted-dark/50">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalPageViews')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {adminMetricsData.pageViewsByPath.reduce((s, p) => s + p.count, 0) ?? 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('metrics.lastDays', { days: adminMetricsData.days ?? Number(days) ?? 30 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50 dark:bg-muted-dark/50">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalSessions')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{adminMetricsData.sessionsSummary?.totalSessions ?? 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('metrics.lastDays', { days: adminMetricsData.days ?? Number(days) ?? 30 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50 dark:bg-muted-dark/50">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('metrics.avgTimeOnSite')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatDuration(adminMetricsData.sessionsSummary?.avgSessionDurationMs ?? 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('metrics.perSession')}</p>
                      </CardContent>
                    </Card>
                  </div>
                  {(adminMetricsData.deviceBreakdown?.byType?.length || adminMetricsData.referrerBreakdown?.length) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {adminMetricsData.deviceBreakdown?.byType?.length ? (
                        <Card className="bg-muted/50 dark:bg-muted-dark/50">
                          <CardHeader className="py-2 px-4">
                            <CardTitle className="text-sm font-medium">{t('metrics.operatingSystem')}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 pt-0">
                            <ResponsiveContainer width="100%" height={180}>
                              <PieChart>
                                <Pie
                                  data={adminMetricsData.deviceBreakdown.byType.map((d) => ({
                                    name: t(`metrics.os.${d.deviceType}` as const),
                                    value: d.count,
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={65}
                                  paddingAngle={2}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {adminMetricsData.deviceBreakdown.byType.map((_, i) => (
                                    <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.sessions')]} />
                                <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      ) : null}
                      {adminMetricsData.referrerBreakdown?.length ? (
                        <Card className="bg-muted/50 dark:bg-muted-dark/50">
                          <CardHeader className="py-2 px-4">
                            <CardTitle className="text-sm font-medium">{t('metrics.trafficSources')}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 pt-0">
                            <ResponsiveContainer width="100%" height={180}>
                              <PieChart>
                                <Pie
                                  data={adminMetricsData.referrerBreakdown.map((r) => ({ name: t(`metrics.referrer.${r.referrerCategory}` as const), value: r.count }))}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={65}
                                  paddingAngle={2}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {adminMetricsData.referrerBreakdown.map((_, i) => (
                                    <Cell key={i} fill={REFERRER_COLORS[i % REFERRER_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: unknown) => [value as React.ReactNode, t('metrics.views')]} />
                                <Legend formatter={(value, entry) => `${value} (${entry?.payload?.value ?? 0})`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  ) : null}
                  {adminMetricsData.topPages?.length ? (
                    <Card className="bg-muted/50 dark:bg-muted-dark/50">
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm font-medium">{t('metrics.topPages')}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 pt-0">
                        <div className="max-h-48 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">{t('metrics.path')}</TableHead>
                                <TableHead className="text-right text-xs">{t('metrics.views')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {adminMetricsData.topPages.slice(0, 10).map((row) => (
                                <TableRow key={row.path}>
                                  <TableCell className="font-mono text-xs truncate max-w-[180px]" title={row.path}>{row.path}</TableCell>
                                  <TableCell className="text-right text-xs">{row.count}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{t('metrics.noDataYet')}</p>
              )}
            </CardContent>
          )}
        </Card>
      )}

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
      ) : disabled ? (
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-4">
            <p className="text-gray-600 dark:text-gray-400">
              {data?.message ?? t('metrics.disabledMessage')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalPageViews')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data?.pageViewsByPath.reduce((s, p) => s + p.count, 0) ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.lastDays', { days: data?.days ?? Number(days) ?? 30 })}</p>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('metrics.totalSessions')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data?.sessionsSummary?.totalSessions ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('metrics.lastDays', { days: data?.days ?? Number(days) ?? 30 })}</p>
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
      )}
    </div>
  );
}
