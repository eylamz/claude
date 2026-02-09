'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@/components/ui';
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

const REFERRER_LABELS: Record<string, string> = {
  direct: 'Direct',
  internal: 'Internal',
  google: 'Google',
  social: 'Social',
  other: 'Other',
};

const CONSENT_LABELS: Record<string, string> = {
  accept_all: 'Accept all',
  reject_non_essential: 'Reject non-essential',
  save_preferences: 'Save preferences',
};

const DEVICE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const CONSENT_COLORS = ['#10B981', '#F59E0B', '#6366F1'];
const REFERRER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${min}m ${s}s`;
}

export default function AdminMetricsPage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricsData | null>(null);
  const [days, setDays] = useState(30);

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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text dark:text-text-dark">Metrics</h1>
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-6">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={() => fetchMetrics()}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const disabled = !data?.enabled;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Metrics</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Analytics for page views, sessions, devices, consent, and traffic sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-border dark:border-border-dark bg-background dark:bg-background-dark px-3 py-2 text-sm text-text dark:text-text-dark"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="secondary" onClick={() => fetchMetrics()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card dark:bg-card-dark">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : disabled ? (
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-6">
            <p className="text-text-secondary dark:text-text-secondary-dark">
              {data?.message ?? 'Analytics is disabled.'} Set NEXT_PUBLIC_ENABLE_ANALYTICS=true in .env.local and restart the server.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Total page views</p>
                <p className="text-2xl font-bold text-text dark:text-text-dark mt-1">
                  {data?.pageViewsByPath.reduce((s, p) => s + p.count, 0) ?? 0}
                </p>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">Last {data?.days ?? 30} days</p>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Total sessions</p>
                <p className="text-2xl font-bold text-text dark:text-text-dark mt-1">
                  {data?.sessionsSummary?.totalSessions ?? 0}
                </p>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">Last {data?.days ?? 30} days</p>
              </CardContent>
            </Card>
            <Card className="bg-card dark:bg-card-dark">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Avg. time on site</p>
                <p className="text-2xl font-bold text-text dark:text-text-dark mt-1">
                  {formatDuration(data?.sessionsSummary?.avgSessionDurationMs ?? 0)}
                </p>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">Per session</p>
              </CardContent>
            </Card>
          </div>

          {/* Top pages & Page views chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-text dark:text-text-dark">Top pages (by views)</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.topPages?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.topPages.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border dark:stroke-border-dark" />
                      <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                      <YAxis type="category" dataKey="path" width={120} tick={{ fill: 'currentColor', fontSize: 11 }} tickFormatter={(v) => (v.length > 30 ? v.slice(0, 28) + '…' : v)} />
                      <Tooltip formatter={(value: unknown) => [Number(value), 'Views']} labelFormatter={(label: unknown) => String(label)} />
                      <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Views" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-text-secondary dark:text-text-secondary-dark text-sm">No page view data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-text dark:text-text-dark">Traffic sources</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.referrerBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.referrerBreakdown.map((r) => ({ name: REFERRER_LABELS[r.referrerCategory] ?? r.referrerCategory, value: r.count }))}
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
                      <Tooltip formatter={(value: unknown) => [value, 'Views']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-text-secondary dark:text-text-secondary-dark text-sm">No referrer data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Device & Consent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-text dark:text-text-dark">Devices</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.deviceBreakdown?.byCategory?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown.byCategory.map((d) => ({ name: d.category, value: d.count }))}
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
                      <Tooltip formatter={(value: unknown) => [value, 'Sessions']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-text-secondary dark:text-text-secondary-dark text-sm">No device data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-text dark:text-text-dark">Cookie consent</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.consentBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.consentBreakdown.map((c) => ({ name: CONSENT_LABELS[c.choice] ?? c.choice, value: c.count }))}
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
                      <Tooltip formatter={(value: unknown) => [value, 'Users']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-text-secondary dark:text-text-secondary-dark text-sm">No consent data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tables: Page views by path, Avg time on page */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-text dark:text-text-dark">Page views by path</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.pageViewsByPath?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pageViewsByPath.slice(0, 25).map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-mono text-xs text-text dark:text-text-dark truncate max-w-[200px]" title={row.path}>{row.path}</TableCell>
                            <TableCell className="text-right">{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-text-secondary dark:text-text-secondary-dark text-sm">No data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-card-dark">
              <CardHeader>
                <CardTitle className="text-text dark:text-text-dark">Avg. time on page</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.avgTimeOnPageByPath?.length ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead className="text-right">Avg. time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.avgTimeOnPageByPath.slice(0, 25).map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-mono text-xs text-text dark:text-text-dark truncate max-w-[200px]" title={row.path}>{row.path}</TableCell>
                            <TableCell className="text-right">{formatDuration(row.avgTimeOnPageMs)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-text-secondary dark:text-text-secondary-dark text-sm">No data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
