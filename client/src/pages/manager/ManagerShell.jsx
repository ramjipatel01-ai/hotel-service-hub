import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRequestRealtime } from '../../hooks/useRequestRealtime';
import { AppLayout } from '../../layouts';
import {
  Button,
  Badge,
  StatusBadge,
  PriorityBadge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Modal,
  LoadingSpinner,
  SkeletonLoader,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  FilterBar,
  ResponsiveTable,
  Toast,
} from '../../components/common';
import {
  getAnalyticsOverview,
  getRequestTrends,
  getDepartmentAnalytics,
  getStaffPerformance,
  getSLAMonitoring,
  getGuestSatisfaction,
  getTopServices,
  getPriorityDistribution,
  downloadReportCSV,
  getDepartments,
  getRequests,
} from '../../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Layers,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  Star,
  Calendar,
  ShieldAlert,
  Activity,
  FileSpreadsheet,
  Zap,
  ListFilter,
  Check,
  ChevronRight,
  Clock3,
} from 'lucide-react';
import { REQUEST_STATUS, REQUEST_PRIORITY } from '../../utils/constants';

// Semantic chart color tokens matching design.md
const PRIORITY_COLORS = {
  LOW: '#94A3B8', // Slate 400
  NORMAL: '#3B82F6', // Blue 500
  HIGH: '#F59E0B', // Amber 500
  URGENT: '#EF4444', // Rose 500
};

const CHART_PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#EC4899'];

export default function ManagerShell() {
  const { user } = useAuth();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'departments' | 'sla' | 'staff' | 'satisfaction' | 'stream'

  // Filter States
  const [period, setPeriod] = useState('last30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Operational Stream Table Filters
  const [streamStatus, setStreamStatus] = useState('ALL');
  const [streamSearch, setStreamSearch] = useState('');

  // Data States
  const [departmentsList, setDepartmentsList] = useState([]);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [deptAnalytics, setDeptAnalytics] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [slaData, setSlaData] = useState(null);
  const [satisfaction, setSatisfaction] = useState(null);
  const [topServices, setTopServices] = useState([]);
  const [priorityDist, setPriorityDist] = useState(null);
  const [streamRequests, setStreamRequests] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('requests');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Debounce ref for live updates
  const refreshTimeoutRef = useRef(null);

  // Compute active query parameters for analytics endpoints
  const queryParams = useMemo(() => {
    const params = { period };
    if (period === 'custom') {
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;
    }
    if (selectedDept) params.departmentId = selectedDept;
    return params;
  }, [period, customStart, customEnd, selectedDept]);

  // Load Department Catalog once
  useEffect(() => {
    getDepartments()
      .then((res) => setDepartmentsList(res || []))
      .catch((err) => console.warn('Failed to load departments:', err.message));
  }, []);

  // Primary Data Fetcher
  const fetchAllAnalytics = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setErrorMessage(null);

      const [
        overviewRes,
        trendsRes,
        deptsRes,
        staffRes,
        slaRes,
        csatRes,
        topSvcRes,
        prioRes,
        streamRes,
      ] = await Promise.all([
        getAnalyticsOverview(queryParams),
        getRequestTrends(queryParams),
        getDepartmentAnalytics({
          period: queryParams.period,
          startDate: queryParams.startDate,
          endDate: queryParams.endDate,
        }),
        getStaffPerformance(queryParams),
        getSLAMonitoring({ departmentId: queryParams.departmentId }),
        getGuestSatisfaction(queryParams),
        getTopServices({ ...queryParams, limit: 6 }),
        getPriorityDistribution(queryParams),
        getRequests({ limit: 50, department: queryParams.departmentId || undefined }),
      ]);

      if (overviewRes?.success) setOverview(overviewRes.data);
      if (trendsRes?.success) setTrends(trendsRes.data?.trends || []);
      if (deptsRes?.success) setDeptAnalytics(deptsRes.data?.departments || []);
      if (staffRes?.success) setStaffData(staffRes.data?.staffPerformance || []);
      if (slaRes?.success) setSlaData(slaRes.data);
      if (csatRes?.success) setSatisfaction(csatRes.data);
      if (topSvcRes?.success) setTopServices(topSvcRes.data?.topServices || []);
      if (prioRes?.success) setPriorityDist(prioRes.data);
      if (streamRes?.success) setStreamRequests(streamRes.data?.requests || []);
    } catch (err) {
      console.error('Analytics load error:', err);
      setErrorMessage(err.message || 'Failed to synchronize executive analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  // Real-Time Socket.IO Synchronization (Debounced)
  const scheduleLiveRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      fetchAllAnalytics(true);
    }, 1200);
  }, [fetchAllAnalytics]);

  useRequestRealtime({
    onRequestCreated: scheduleLiveRefresh,
    onRequestUpdated: scheduleLiveRefresh,
  });

  // Export CSV Handler
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await downloadReportCSV({
        ...queryParams,
        type: exportType,
      });
      setExportModalOpen(false);
      setToast({
        type: 'success',
        title: 'Report Exported Successfully',
        message: `Saved as ${res.filename}`,
      });
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Unable to generate CSV report.',
      });
    } finally {
      setExporting(false);
    }
  };

  // Filtered operational stream table data
  const filteredStream = useMemo(() => {
    return streamRequests.filter((r) => {
      const matchesStatus = streamStatus === 'ALL' || r.status === streamStatus;
      const matchesSearch =
        !streamSearch ||
        r.requestNumber?.toLowerCase().includes(streamSearch.toLowerCase()) ||
        r.serviceTitle?.toLowerCase().includes(streamSearch.toLowerCase()) ||
        r.guest?.name?.toLowerCase().includes(streamSearch.toLowerCase()) ||
        r.room?.roomNumber?.toLowerCase().includes(streamSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [streamRequests, streamStatus, streamSearch]);

  // Operational Stream Table Columns
  const streamColumns = [
    {
      header: 'Ticket #',
      accessor: 'requestNumber',
      cellClassName: 'font-mono font-bold text-slate-900',
    },
    {
      header: 'Room & Guest',
      render: (t) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono text-xs">
            Room {t.room?.roomNumber || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500">{t.guest?.name || 'Guest'}</span>
        </div>
      ),
    },
    {
      header: 'Service & Dept',
      render: (t) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{t.serviceTitle}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {t.department?.name || 'Department'}
          </span>
        </div>
      ),
    },
    {
      header: 'Priority',
      render: (t) => <PriorityBadge priority={t.priority} size="sm" />,
    },
    {
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} size="sm" />,
    },
    {
      header: 'Assigned Staff',
      render: (t) => (
        <span className="text-xs text-slate-600">
          {t.assignedStaff?.name || <span className="text-slate-400 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      header: 'Created Time',
      cellClassName: 'text-slate-500 text-xs font-mono',
      render: (t) =>
        t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    },
  ];

  // Department Table Columns
  const deptColumns = [
    {
      header: 'Department',
      render: (d) => (
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 uppercase font-mono">
            {d.code}
          </span>
          <span className="font-bold text-slate-900 text-xs">{d.name}</span>
        </div>
      ),
    },
    { header: 'Total', accessor: 'totalRequests', cellClassName: 'font-bold text-slate-900 text-center' },
    { header: 'Pending', accessor: 'pendingRequests', cellClassName: 'text-amber-700 font-semibold text-center' },
    { header: 'In Progress', accessor: 'inProgressRequests', cellClassName: 'text-indigo-700 font-semibold text-center' },
    { header: 'Completed', accessor: 'completedRequests', cellClassName: 'text-emerald-700 font-semibold text-center' },
    { header: 'Confirmed', accessor: 'confirmedRequests', cellClassName: 'text-teal-700 font-semibold text-center' },
    { header: 'Cancelled', accessor: 'cancelledRequests', cellClassName: 'text-rose-600 font-semibold text-center' },
    { header: 'Urgent', accessor: 'urgentRequests', cellClassName: 'text-rose-700 font-black text-center' },
    {
      header: 'Resolution Rate',
      render: (d) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                d.resolutionRate >= 80 ? 'bg-emerald-500' : d.resolutionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${d.resolutionRate}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-800">{d.resolutionRate}%</span>
        </div>
      ),
    },
    {
      header: 'Avg Response',
      render: (d) => (
        <span className="text-xs font-mono text-slate-600">
          {d.avgResponseTimeMinutes !== null ? `${d.avgResponseTimeMinutes}m` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Avg Complete',
      render: (d) => (
        <span className="text-xs font-mono text-slate-600">
          {d.avgCompletionTimeMinutes !== null ? `${d.avgCompletionTimeMinutes}m` : 'N/A'}
        </span>
      ),
    },
  ];

  // Staff Performance Columns
  const staffColumns = [
    {
      header: 'Staff Member',
      render: (s) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{s.name}</span>
          <span className="text-[10px] text-slate-400">{s.email}</span>
        </div>
      ),
    },
    {
      header: 'Department',
      render: (s) => (
        <span className="text-xs font-medium text-slate-700">{s.departmentName}</span>
      ),
    },
    {
      header: 'Duty Status',
      render: (s) => (
        <Badge variant={s.isOnDuty ? 'emerald' : 'slate'} size="xs" dot>
          {s.isOnDuty ? 'On Duty' : 'Off Duty'}
        </Badge>
      ),
    },
    { header: 'Assigned', accessor: 'requestsAssigned', cellClassName: 'font-semibold text-center' },
    { header: 'Completed', accessor: 'requestsCompleted', cellClassName: 'text-emerald-700 font-bold text-center' },
    {
      header: 'Active Load',
      render: (s) => (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          s.currentActiveWorkload > 3 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
        }`}>
          {s.currentActiveWorkload}
        </span>
      ),
    },
    {
      header: 'Avg Response',
      render: (s) => (
        <span className="text-xs font-mono text-slate-600">
          {s.avgResponseTimeMinutes !== null ? `${s.avgResponseTimeMinutes}m` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Avg Complete',
      render: (s) => (
        <span className="text-xs font-mono text-slate-600">
          {s.avgCompletionTimeMinutes !== null ? `${s.avgCompletionTimeMinutes}m` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'CSAT Rating',
      render: (s) => (
        <div className="flex items-center space-x-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span className="font-bold text-xs text-slate-800">
            {s.avgRating !== null ? s.avgRating : '—'}
          </span>
          <span className="text-[10px] text-slate-400">({s.ratingCount})</span>
        </div>
      ),
    },
  ];

  // SLA Overdue Table Columns
  const slaOverdueColumns = [
    {
      header: 'Ticket #',
      accessor: 'requestNumber',
      cellClassName: 'font-mono font-bold text-rose-700',
    },
    {
      header: 'Service & Dept',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{r.serviceTitle}</span>
          <span className="text-[10px] text-slate-400">{r.departmentName}</span>
        </div>
      ),
    },
    {
      header: 'Room',
      render: (r) => <span className="font-mono text-xs font-bold text-slate-700">Rm {r.roomNumber}</span>,
    },
    {
      header: 'Priority',
      render: (r) => <PriorityBadge priority={r.priority} size="sm" />,
    },
    {
      header: 'Current Status',
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      header: 'Staff Assignee',
      render: (r) => <span className="text-xs text-slate-600">{r.assignedStaffName}</span>,
    },
    {
      header: 'Elapsed',
      render: (r) => (
        <span className="font-mono text-xs text-slate-700 font-semibold">{r.elapsedMinutes}m</span>
      ),
    },
    {
      header: 'SLA Limit',
      render: (r) => (
        <span className="font-mono text-xs text-slate-500">{r.estimatedDurationMinutes}m</span>
      ),
    },
    {
      header: 'Overdue By',
      render: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
          +{r.overdueMinutes}m
        </span>
      ),
    },
  ];

  return (
    <AppLayout
      portalName="Executive Analytics Hub"
      headerActions={
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            icon={Download}
            aria-label="Export Analytics CSV"
          >
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllAnalytics(false)}
            loading={refreshing}
            icon={RefreshCw}
            aria-label="Refresh Analytics"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      }
    >
      {/* Toast Alert */}
      {toast && (
        <div className="mb-4">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6">
          <ErrorState
            title="Analytics Synchronization Failure"
            message={errorMessage}
            onRetry={() => fetchAllAnalytics(false)}
          />
        </div>
      )}

      {/* Page Header with Resolution Rate Badge */}
      <PageHeader
        title="Executive Operations & SLA Control"
        description="Hotel-wide request volumes, turnaround speeds, department SLA compliance, and guest satisfaction"
        icon={TrendingUp}
        badge={
          <Badge variant="indigo" dot>
            Verified MongoDB Aggregations
          </Badge>
        }
        actions={
          overview && (
            <div className="flex items-center space-x-3 bg-white border border-slate-200/90 shadow-sm px-4 py-2.5 rounded-2xl">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Overall Resolution
                </span>
                <span className="text-2xl font-black text-indigo-600">
                  {overview.resolutionRate}%
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          )
        }
      />

      {/* Global Filter & Preset Controls */}
      <Card className="p-4 mb-6 bg-slate-50/70 border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset Period Selector Buttons */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'last7days', label: 'Last 7 Days' },
              { id: 'last30days', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'previousMonth', label: 'Previous Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  period === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Department Filter Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Department:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {period === 'custom' && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600">Start Date:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600">End Date:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <span className="text-[11px] text-slate-500 italic">
              Chronological bounds applied in UTC
            </span>
          </div>
        )}
      </Card>

      {/* Executive KPI Metric Cards */}
      {loading && !overview ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} type="metric" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="p-4 border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Requests
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {overview.totalRequests}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded tickets</span>
          </Card>

          <Card className="p-4 bg-amber-50/50 border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Pending
            </span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">
              {overview.pendingRequests}
            </span>
            <span className="text-[10px] text-amber-700 mt-0.5 block">Awaiting triage</span>
          </Card>

          <Card className="p-4 bg-indigo-50/50 border-indigo-200">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
              In Progress
            </span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">
              {overview.inProgressRequests}
            </span>
            <span className="text-[10px] text-indigo-700 mt-0.5 block">Active on floor</span>
          </Card>

          <Card className="p-4 bg-emerald-50/50 border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Completed
            </span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">
              {overview.resolvedRequests}
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block">
              {overview.completedRequests} done, {overview.confirmedRequests} confirmed
            </span>
          </Card>

          <Card className="p-4 bg-rose-50/50 border-rose-200">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
              Urgent Priority
            </span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">
              {overview.urgentRequests}
            </span>
            <span className="text-[10px] text-rose-700 mt-0.5 block">High escalation</span>
          </Card>

          <Card className={`p-4 ${
            overview.outstandingOverdueRequests > 0
              ? 'bg-rose-100/70 border-rose-300 ring-2 ring-rose-400'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center">
              {overview.outstandingOverdueRequests > 0 && (
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600 animate-pulse" />
              )}
              SLA Overdue
            </span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">
              {overview.outstandingOverdueRequests}
            </span>
            <span className="text-[10px] text-rose-700 mt-0.5 block">Exceeded threshold</span>
          </Card>
        </div>
      ) : null}

      {/* Speed & Turnaround Metric Bar */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Avg Response Time
                </span>
                <span className="text-lg font-black text-slate-800">
                  {overview.avgResponseTimeMinutes !== null
                    ? `${overview.avgResponseTimeMinutes} minutes`
                    : 'N/A'}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Created → Accepted</span>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Avg Completion Time
                </span>
                <span className="text-lg font-black text-slate-800">
                  {overview.avgCompletionTimeMinutes !== null
                    ? `${overview.avgCompletionTimeMinutes} minutes`
                    : 'N/A'}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Created → Completed</span>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Guest Satisfaction (CSAT)
                </span>
                <span className="text-lg font-black text-slate-800">
                  {satisfaction?.averageRating !== null && satisfaction?.averageRating !== undefined
                    ? `${satisfaction.averageRating} / 5.0`
                    : 'N/A'}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              {satisfaction?.totalRatings || 0} reviews
            </span>
          </Card>
        </div>
      )}

      {/* Portal Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Trends', icon: BarChart3 },
          { id: 'departments', label: 'Department Analytics', icon: Layers },
          { id: 'sla', label: 'SLA Monitoring', icon: ShieldAlert, badge: overview?.outstandingOverdueRequests },
          { id: 'staff', label: 'Staff Leaderboard', icon: Users },
          { id: 'satisfaction', label: 'Guest Feedback (CSAT)', icon: Star },
          { id: 'stream', label: 'Live Operational Stream', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {Boolean(tab.badge) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: OVERVIEW & TRENDS ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Daily Request Volume Trends Area Chart */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
                  Request Volume & Resolution Trends
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily breakdown of created, completed, confirmed, and cancelled requests over selected reporting period
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-400 mt-2 sm:mt-0">
                {overview?.startDate?.slice(0, 10)} to {overview?.endDate?.slice(0, 10)}
              </span>
            </div>

            {trends.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No Trend Observations"
                description="No request activity recorded for the selected date range."
              />
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '0.75rem',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name="Created Requests"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#createdGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed Requests"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#completedGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cancelled"
                      name="Cancelled Requests"
                      stroke="#F43F5E"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Two-Column Grid: Priority Distribution + Top Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Distribution Pie Chart */}
            <Card className="p-6">
              <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center">
                <ShieldAlert className="w-5 h-5 text-amber-500 mr-2" />
                Request Priority Distribution
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Proportion of service tickets by initial urgency designation
              </p>

              {priorityDist && priorityDist.totalRequests > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-around h-64">
                  <div className="w-56 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityDist.distribution}
                          dataKey="count"
                          nameKey="priority"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {priorityDist.distribution.map((entry) => (
                            <Cell
                              key={entry.priority}
                              fill={PRIORITY_COLORS[entry.priority] || '#94A3B8'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} requests`, `Priority: ${name}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-4 sm:mt-0">
                    {priorityDist.distribution.map((p) => (
                      <div key={p.priority} className="flex items-center space-x-2 text-xs">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLORS[p.priority] }}
                        />
                        <span className="font-bold text-slate-700 w-16">{p.priority}</span>
                        <span className="font-mono text-slate-900 font-bold">{p.count}</span>
                        <span className="text-slate-400">({p.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={ShieldAlert}
                  title="No Priority Records"
                  description="No request priority data exists for the selected timeframe."
                />
              )}
            </Card>

            {/* Top Requested Services Ranking */}
            <Card className="p-6">
              <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center">
                <Zap className="w-5 h-5 text-indigo-600 mr-2" />
                Frequently Requested Services
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Catalog items generating highest guest demand
              </p>

              {topServices.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No Service Data"
                  description="No services have been ordered in this reporting period."
                />
              ) : (
                <div className="space-y-3">
                  {topServices.map((svc, idx) => (
                    <div
                      key={svc.serviceTitle}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">
                            {svc.serviceTitle}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {svc.departmentName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs text-slate-900 block font-mono">
                          {svc.count} orders ({svc.sharePercentage}%)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Avg: {svc.avgCompletionTimeMinutes !== null ? `${svc.avgCompletionTimeMinutes}m` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ================= TAB 2: DEPARTMENT ANALYTICS ================= */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          {/* Department Cards Grid (Preserving Phase 6 design) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {deptAnalytics.map((dept) => (
              <div
                key={dept.departmentId}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase font-mono">
                      {dept.code}
                    </span>
                    <Badge variant={dept.isActive ? 'emerald' : 'slate'} size="xs">
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">{dept.name}</h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Volume:</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {dept.totalRequests}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span>Resolution:</span>
                    <span className="font-bold text-indigo-600">{dept.resolutionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span>Avg Turnaround:</span>
                    <span className="font-mono text-slate-700">
                      {dept.avgCompletionTimeMinutes !== null ? `${dept.avgCompletionTimeMinutes}m` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Department Volume Comparison Bar Chart */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center">
              <Layers className="w-5 h-5 text-indigo-600 mr-2" />
              Departmental Volume & Resolution Comparison
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Comparative workload and fulfillment throughput across hotel departments
            </p>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '0.75rem',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="totalRequests" name="Total Requests" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completedRequests" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendingRequests" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Complete Department Performance Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800">
                Department Performance Data Matrix
              </h3>
            </div>
            <ResponsiveTable
              columns={deptColumns}
              data={deptAnalytics}
              keyExtractor={(d) => d.departmentId}
              emptyTitle="No Department Metrics"
              emptyDescription="No department records available."
              striped
            />
          </Card>
        </div>
      )}

      {/* ================= TAB 3: SLA MONITORING ================= */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          {/* SLA Status Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-rose-50 border-rose-200">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    Critical SLA Breaches
                  </span>
                  <span className="text-3xl font-black text-rose-900 mt-1 block">
                    {slaData?.overdueCount || 0}
                  </span>
                  <span className="text-[11px] text-rose-700 mt-0.5 block">
                    Elapsed time &gt; configured SLA
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-amber-50 border-amber-200">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
                  <Clock3 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    Approaching Deadline
                  </span>
                  <span className="text-3xl font-black text-amber-900 mt-1 block">
                    {slaData?.approachingCount || 0}
                  </span>
                  <span className="text-[11px] text-amber-700 mt-0.5 block">
                    Elapsed time $\ge$ 75% of limit
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-emerald-50 border-emerald-200">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Within Standard SLA
                  </span>
                  <span className="text-3xl font-black text-emerald-900 mt-1 block">
                    {slaData?.onTrackCount || 0}
                  </span>
                  <span className="text-[11px] text-emerald-700 mt-0.5 block">
                    Healthy active tickets
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Overdue Requests Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-rose-50/60 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-rose-950">
                  Live Overdue Requests Requiring Immediate Intervention
                </h3>
              </div>
              <Badge variant="rose" size="sm">
                {slaData?.overdueCount || 0} Tickets Breached
              </Badge>
            </div>

            <ResponsiveTable
              columns={slaOverdueColumns}
              data={slaData?.overdueRequests || []}
              keyExtractor={(r) => r.requestId}
              emptyTitle="Zero SLA Breaches"
              emptyDescription="All active operational requests are currently progressing within their configured SLA limits."
              striped
            />
          </Card>

          {/* Approaching SLA Table */}
          {slaData?.approachingRequests?.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm text-amber-950">
                    Requests Approaching SLA Deadline (75%+ Elapsed)
                  </h3>
                </div>
                <Badge variant="amber" size="sm">
                  {slaData?.approachingCount} Tickets Warning
                </Badge>
              </div>

              <ResponsiveTable
                columns={slaOverdueColumns}
                data={slaData?.approachingRequests}
                keyExtractor={(r) => r.requestId}
                striped
              />
            </Card>
          )}
        </div>
      )}

      {/* ================= TAB 4: STAFF LEADERBOARD ================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center">
                <Users className="w-5 h-5 text-indigo-600 mr-2" />
                Staff Workload & Service Performance Leaderboard
              </h3>
              <span className="text-xs text-slate-500">
                Derived from verified Task execution records & Guest ratings
              </span>
            </div>

            <ResponsiveTable
              columns={staffColumns}
              data={staffData}
              keyExtractor={(s) => s.staffId}
              emptyTitle="No Staff Records"
              emptyDescription="No staff members match the selected criteria."
              striped
            />
          </Card>
        </div>
      )}

      {/* ================= TAB 5: GUEST SATISFACTION (CSAT) ================= */}
      {activeTab === 'satisfaction' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall CSAT Card */}
            <Card className="p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Customer Satisfaction Score (CSAT)
                </span>
                <div className="flex items-baseline space-x-3 mt-3">
                  <span className="text-5xl font-black text-slate-900">
                    {satisfaction?.averageRating !== null && satisfaction?.averageRating !== undefined
                      ? satisfaction.averageRating
                      : '—'}
                  </span>
                  <span className="text-lg font-bold text-slate-400">/ 5.0</span>
                </div>
                <div className="flex items-center space-x-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        (satisfaction?.averageRating || 0) >= star
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-slate-100 text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                Calculated across <strong className="text-slate-800">{satisfaction?.totalRatings || 0}</strong> verified guest reviews in selected period.
              </div>
            </Card>

            {/* Star Distribution Progress Bars */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="font-bold text-sm text-slate-800 mb-4">Rating Breakdown</h3>
              <div className="space-y-2.5">
                {(satisfaction?.ratingDistribution || []).map((dist) => (
                  <div key={dist.stars} className="flex items-center space-x-3 text-xs">
                    <span className="w-12 font-bold text-slate-700 flex items-center">
                      {dist.stars} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 ml-1" />
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${dist.percentage}%` }}
                      />
                    </div>
                    <span className="w-14 text-right font-mono font-bold text-slate-800">
                      {dist.count} ({dist.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Guest Reviews Feed */}
          <Card className="p-6">
            <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center">
              <Star className="w-4 h-4 text-amber-500 mr-2" />
              Recent Verified Guest Feedback
            </h3>

            {satisfaction?.recentFeedback?.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No Guest Reviews Yet"
                description="No feedback has been submitted during this reporting window."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {satisfaction?.recentFeedback?.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                rev.rating >= s
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'fill-slate-200 text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 italic">
                        "{rev.comment || 'No review comment provided.'}"
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">{rev.serviceTitle}</span>
                      <span>Room {rev.roomNumber} ({rev.guestName})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ================= TAB 6: LIVE OPERATIONAL STREAM ================= */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          <FilterBar
            activeCount={streamStatus !== 'ALL' ? 1 : 0}
            onReset={() => {
              setStreamStatus('ALL');
              setStreamSearch('');
            }}
          >
            <select
              value={streamStatus}
              onChange={(e) => setStreamStatus(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {Object.values(REQUEST_STATUS).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <div className="w-full sm:w-64">
              <SearchInput
                placeholder="Filter requests..."
                value={streamSearch}
                onChange={(e) => setStreamSearch(e.target.value)}
                onClear={() => setStreamSearch('')}
              />
            </div>
          </FilterBar>

          <ResponsiveTable
            columns={streamColumns}
            data={filteredStream}
            keyExtractor={(item) => item._id || item.id}
            emptyTitle="No operational requests"
            emptyDescription="No tickets match the selected stream filter criteria."
            striped
          />
        </div>
      )}

      {/* Export Report Dialog Modal */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Operational Report to CSV"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Export authenticated analytics and operational logs filtered by active reporting period (
            <strong>{period}</strong>). Output is formatted as standard RFC-4180 CSV with OWASP formula injection protection.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Select Report Dataset:</label>
            {[
              {
                id: 'requests',
                title: 'Detailed Requests Audit Log',
                desc: 'Individual request records with room, department, timestamps, and durations',
              },
              {
                id: 'departments',
                title: 'Department Performance Summary',
                desc: 'Department volume, resolution rate, and response/completion averages',
              },
              {
                id: 'staff',
                title: 'Staff Workload & Performance Leaderboard',
                desc: 'Staff task assignments, active load, turnaround times, and guest ratings',
              },
              {
                id: 'sla',
                title: 'SLA Monitoring & Overdue Audit',
                desc: 'All monitored tickets with elapsed time, SLA limits, and breach statuses',
              },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${
                  exportType === opt.id
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={opt.id}
                  checked={exportType === opt.id}
                  onChange={() => setExportType(opt.id)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <span className="text-xs font-bold text-slate-900 block">{opt.title}</span>
                  <span className="text-[11px] text-slate-500">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={exporting}
              icon={FileSpreadsheet}
              onClick={handleExportCSV}
            >
              Download CSV
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
