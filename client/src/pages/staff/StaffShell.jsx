import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRequestRealtime } from '../../hooks/useRequestRealtime';
import { AppLayout } from '../../layouts';
import {
  Button,
  Textarea,
  Badge,
  StatusBadge,
  PriorityBadge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  LoadingSpinner,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  FilterBar,
  Toast,
} from '../../components/common';
import {
  getRequests,
  acceptRequest,
  startRequest,
  completeRequest,
  addRequestNote,
  getRequestHistory,
  updateStaffDutyStatus,
} from '../../services/api';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Play,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  User,
  Bed,
  Layers,
  Inbox,
  CheckCheck,
  History,
  Info,
  Calendar,
  AlertCircle,
  Eye,
  FileText,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { REQUEST_STATUS, REQUEST_PRIORITY } from '../../utils/constants';

export default function StaffShell() {
  const { user, updateProfile } = useAuth();

  // Primary State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState('ASSIGNED_TO_ME');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVariant, setToastVariant] = useState('success');
  const [isOnDuty, setIsOnDuty] = useState(user?.isOnDuty ?? true);
  const [dutyLoading, setDutyLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Work Note Modal State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteRequestId, setNoteRequestId] = useState(null);
  const [workNoteText, setWorkNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Complete Request Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingRequestId, setCompletingRequestId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // Detail & History Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketHistory, setTicketHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const userId = (user?._id || user?.id)?.toString();
  const departmentId = (user?.department?._id || user?.department)?.toString();

  // Sync duty state if user prop changes
  useEffect(() => {
    if (user?.isOnDuty !== undefined) {
      setIsOnDuty(user.isOnDuty);
    }
  }, [user?.isOnDuty]);

  // Fetch Department Requests
  const fetchDepartmentRequests = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await getRequests({ limit: 100 });
      const fetchedRequests = res?.data?.requests || res?.requests || [];
      setRequests(fetchedRequests);
    } catch (err) {
      console.warn('Failed to load department requests:', err.message);
      setFetchError(err.message || 'Unable to retrieve department dispatch queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartmentRequests();
  }, [fetchDepartmentRequests]);

  // Real-Time Socket Listener
  useRequestRealtime({
    onRequestCreated: (newReq) => {
      const reqDept = newReq.department?._id || newReq.department || newReq.departmentId;
      if (reqDept && departmentId && reqDept.toString() === departmentId) {
        fetchDepartmentRequests();
        setToastVariant('info');
        setToastMessage(`New incoming request #${newReq.requestNumber} in ${newReq.category || 'your department'}!`);
        setTimeout(() => setToastMessage(null), 6000);
      }
    },
    onRequestAssigned: (assignedReq) => {
      const assignedStaffId = (assignedReq.assignedStaff?._id || assignedReq.assignedStaff || assignedReq.assignedStaffId)?.toString();
      if (assignedStaffId === userId) {
        fetchDepartmentRequests();
        setToastVariant('info');
        setToastMessage(`New task assigned to you: #${assignedReq.requestNumber}!`);
        setTimeout(() => setToastMessage(null), 6000);
      } else {
        fetchDepartmentRequests();
      }
    },
    onRequestUpdated: (updatedPayload) => {
      const reqId = updatedPayload.requestId || updatedPayload._id;
      setRequests((prev) =>
        prev.map((r) => {
          const currentId = (r._id || r.id)?.toString();
          if (currentId === reqId) {
            return {
              ...r,
              status: updatedPayload.status || r.status,
              assignedStaff: updatedPayload.assignedStaffId
                ? { _id: updatedPayload.assignedStaffId, name: updatedPayload.assignedStaffName }
                : r.assignedStaff,
              acceptedAt: updatedPayload.acceptedAt || r.acceptedAt,
              startedAt: updatedPayload.startedAt || r.startedAt,
              completedAt: updatedPayload.completedAt || r.completedAt,
              confirmedAt: updatedPayload.confirmedAt || r.confirmedAt,
            };
          }
          return r;
        })
      );
    },
  });

  // Toggle Duty Switch (Self-Service Endpoint)
  const handleToggleDuty = async () => {
    const nextDuty = !isOnDuty;
    setIsOnDuty(nextDuty);
    setDutyLoading(true);
    try {
      await updateStaffDutyStatus(nextDuty);
      if (updateProfile) {
        updateProfile({ isOnDuty: nextDuty });
      }
      setToastVariant(nextDuty ? 'success' : 'info');
      setToastMessage(`Status updated: You are now ${nextDuty ? 'ON DUTY' : 'OFF DUTY'}.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setIsOnDuty(!nextDuty);
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to update duty status');
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setDutyLoading(false);
    }
  };

  // Staff Lifecycle Execution Actions
  const handleAccept = async (requestId) => {
    try {
      setActionLoadingId(requestId);
      await acceptRequest(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === requestId ? { ...r, status: REQUEST_STATUS.ACCEPTED, acceptedAt: new Date().toISOString() } : r
        )
      );
      setToastVariant('success');
      setToastMessage('Request accepted! Work queue updated.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to accept request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStart = async (requestId) => {
    try {
      setActionLoadingId(requestId);
      await startRequest(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === requestId ? { ...r, status: REQUEST_STATUS.IN_PROGRESS, startedAt: new Date().toISOString() } : r
        )
      );
      setToastVariant('success');
      setToastMessage('Work commenced! Status updated to IN PROGRESS.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to start work.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenCompleteModal = (ticket) => {
    setCompletingRequestId(ticket._id || ticket.id);
    setCompletionNotes('');
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!completingRequestId) return;
    try {
      setCompleteSubmitting(true);
      await completeRequest(completingRequestId, { notes: completionNotes.trim() });
      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === completingRequestId
            ? { ...r, status: REQUEST_STATUS.COMPLETED, completedAt: new Date().toISOString() }
            : r
        )
      );
      setToastVariant('success');
      setToastMessage('Service completed! Awaiting guest final confirmation.');
      setTimeout(() => setToastMessage(null), 4000);
      setCompleteModalOpen(false);
      setCompletingRequestId(null);
      setCompletionNotes('');
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to mark request completed.');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleOpenNoteModal = (ticket) => {
    setNoteRequestId(ticket._id || ticket.id);
    setWorkNoteText('');
    setNoteModalOpen(true);
  };

  const handleSubmitNote = async (e) => {
    e.preventDefault();
    if (!workNoteText.trim() || !noteRequestId) return;
    try {
      setNoteSubmitting(true);
      await addRequestNote(noteRequestId, workNoteText.trim());
      setToastVariant('success');
      setToastMessage('Work note appended to immutable audit trail.');
      setTimeout(() => setToastMessage(null), 3000);
      setNoteModalOpen(false);
      setWorkNoteText('');

      // Refresh history if detail modal is open for this ticket
      if (selectedTicket && (selectedTicket._id || selectedTicket.id) === noteRequestId) {
        loadTicketHistory(noteRequestId);
      }
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to append work note.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Details and History Modal Loader
  const loadTicketHistory = async (id) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const res = await getRequestHistory(id);
      const historyList = Array.isArray(res?.data) ? res.data : res?.data?.history || [];
      setTicketHistory(historyList);
    } catch (err) {
      setHistoryError(err.message || 'Failed to load request history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
    loadTicketHistory(ticket._id || ticket.id);
  };

  // Metric Computations
  const assignedToMe = useMemo(() => {
    return requests.filter((r) => {
      const staffId = (r.assignedStaff?._id || r.assignedStaff)?.toString();
      return staffId === userId && ![REQUEST_STATUS.CONFIRMED, REQUEST_STATUS.CANCELLED].includes(r.status);
    });
  }, [requests, userId]);

  const awaitingAction = useMemo(() => {
    return requests.filter((r) => {
      const staffId = (r.assignedStaff?._id || r.assignedStaff)?.toString();
      return (
        staffId === userId &&
        (r.status === REQUEST_STATUS.ASSIGNED || r.status === REQUEST_STATUS.PENDING)
      );
    });
  }, [requests, userId]);

  const inProgressList = useMemo(() => {
    return requests.filter((r) => {
      const staffId = (r.assignedStaff?._id || r.assignedStaff)?.toString();
      return staffId === userId && r.status === REQUEST_STATUS.IN_PROGRESS;
    });
  }, [requests, userId]);

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return requests.filter((r) => {
      if (![REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CONFIRMED].includes(r.status)) return false;
      const completedDate = r.completedAt ? new Date(r.completedAt).toDateString() : null;
      return completedDate === today || !completedDate;
    });
  }, [requests]);

  const urgentCount = useMemo(() => {
    return requests.filter(
      (r) =>
        r.priority === REQUEST_PRIORITY.URGENT &&
        ![REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CONFIRMED, REQUEST_STATUS.CANCELLED].includes(r.status)
    ).length;
  }, [requests]);

  const departmentPool = useMemo(() => {
    return requests.filter((r) => {
      return ![REQUEST_STATUS.CONFIRMED, REQUEST_STATUS.CANCELLED].includes(r.status);
    });
  }, [requests]);

  // Tab Filtering & Query Matching
  const filteredList = useMemo(() => {
    let list = [];
    if (activeTab === 'ASSIGNED_TO_ME') {
      list = assignedToMe;
    } else if (activeTab === 'DEPT_POOL') {
      list = departmentPool;
    } else if (activeTab === 'COMPLETED') {
      list = completedToday;
    }

    return list.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = item.requestNumber?.toLowerCase().includes(q);
        const matchesService = (item.serviceTitle || item.service?.name || '').toLowerCase().includes(q);
        const matchesRoom = (item.room?.roomNumber || '').toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesService && !matchesRoom && !matchesDesc) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter && item.priority !== priorityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [activeTab, assignedToMe, departmentPool, completedToday, searchQuery, priorityFilter, statusFilter]);

  const navItems = [
    {
      id: 'ASSIGNED_TO_ME',
      label: 'Assigned to Me',
      icon: User,
      badge: assignedToMe.length,
    },
    {
      id: 'DEPT_POOL',
      label: 'Department Pool',
      icon: Layers,
      badge: departmentPool.length,
    },
    {
      id: 'COMPLETED',
      label: 'Completed Today',
      icon: CheckCheck,
      badge: completedToday.length,
    },
  ];

  return (
    <AppLayout
      portalName="Staff Operations Portal"
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={setActiveTab}
      headerActions={
        <div className="flex items-center space-x-3">
          {/* Duty Switch Button */}
          <Button
            variant={isOnDuty ? 'success' : 'secondary'}
            size="sm"
            onClick={handleToggleDuty}
            isLoading={dutyLoading}
            className="font-mono text-xs shadow-sm"
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                isOnDuty ? 'bg-white animate-pulse' : 'bg-slate-400'
              }`}
            />
            {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDepartmentRequests}
            icon={RefreshCw}
            aria-label="Refresh Queue"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      }
    >
      {/* Toast Alert */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Staff Operational Header */}
      <PageHeader
        title={user?.name || 'Staff Console'}
        description={`Active department queue for ${
          user?.department?.name || 'General Operations'
        } & real-time service request execution.`}
        icon={Wrench}
        badge={
          <Badge variant="indigo">
            {user?.department?.name || 'Staff Member'}
          </Badge>
        }
      />

      {/* Off-Duty Warning Banner */}
      {!isOnDuty && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-950">You are currently OFF DUTY</h4>
            <p className="text-amber-800 text-xs mt-0.5">
              New incoming service requests will not be automatically assigned to you. You can still view, update, and complete tasks that are currently assigned to you.
            </p>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={handleToggleDuty}
            className="border-amber-300 text-amber-900 hover:bg-amber-100 flex-shrink-0"
          >
            Resume Duty
          </Button>
        </div>
      )}

      {/* KPI Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned to Me</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{assignedToMe.length}</span>
            <span className="text-xs text-indigo-600 font-medium">Active</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Awaiting Action</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{awaitingAction.length}</span>
            <span className="text-xs text-amber-600 font-medium">Pending/Assigned</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <Play className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{inProgressList.length}</span>
            <span className="text-xs text-violet-600 font-medium">Working</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{completedToday.length}</span>
            <span className="text-xs text-emerald-600 font-medium">Done</span>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Urgent Requests</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{urgentCount}</span>
            <span className="text-xs text-rose-600 font-medium">High Priority</span>
          </div>
        </Card>
      </div>

      {/* Queue Tabs and Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <Button
            variant={activeTab === 'ASSIGNED_TO_ME' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('ASSIGNED_TO_ME')}
            icon={User}
          >
            Assigned to Me ({assignedToMe.length})
          </Button>
          <Button
            variant={activeTab === 'DEPT_POOL' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('DEPT_POOL')}
            icon={Layers}
          >
            Department Pool ({departmentPool.length})
          </Button>
          <Button
            variant={activeTab === 'COMPLETED' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('COMPLETED')}
            icon={CheckCheck}
          >
            Completed ({completedToday.length})
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 md:col-span-5">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search by REQ#, service, room, or description..."
            />
          </div>

          <div className="sm:col-span-3 md:col-span-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full text-xs h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value={REQUEST_PRIORITY.URGENT}>Urgent</option>
              <option value={REQUEST_PRIORITY.HIGH}>High</option>
              <option value={REQUEST_PRIORITY.NORMAL}>Normal</option>
              <option value={REQUEST_PRIORITY.LOW}>Low</option>
            </select>
          </div>

          <div className="sm:col-span-3 md:col-span-4 flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs h-10 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value={REQUEST_STATUS.PENDING}>Pending</option>
              <option value={REQUEST_STATUS.ASSIGNED}>Assigned</option>
              <option value={REQUEST_STATUS.ACCEPTED}>Accepted</option>
              <option value={REQUEST_STATUS.IN_PROGRESS}>In Progress</option>
              <option value={REQUEST_STATUS.COMPLETED}>Completed</option>
              <option value={REQUEST_STATUS.CONFIRMED}>Confirmed</option>
            </select>

            {(searchQuery || priorityFilter || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('');
                  setStatusFilter('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex-shrink-0"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && requests.length === 0 ? (
        <div className="py-16">
          <LoadingSpinner size="lg" message="Loading department dispatch queue..." />
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Queue Unavailable"
          message={fetchError}
          onRetry={fetchDepartmentRequests}
        />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No matching requests"
          description={
            searchQuery || priorityFilter || statusFilter
              ? 'Try modifying your search or filters to see more requests.'
              : activeTab === 'ASSIGNED_TO_ME'
              ? 'You have no active requests assigned to you right now.'
              : activeTab === 'COMPLETED'
              ? 'No requests have been completed in your department today.'
              : 'The department queue is currently empty.'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDepartmentRequests}
              icon={RefreshCw}
            >
              Refresh Queue
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((ticket) => {
            const ticketId = ticket._id || ticket.id;
            const staffId = (ticket.assignedStaff?._id || ticket.assignedStaff)?.toString();
            const isAssignedToMe = staffId === userId;
            const isUnassigned = !ticket.assignedStaff;

            return (
              <Card
                key={ticketId}
                className="flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow duration-200 border-slate-200/90"
              >
                <div>
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        #{ticket.requestNumber}
                      </span>
                      <PriorityBadge priority={ticket.priority} size="sm" />
                    </div>
                    <StatusBadge status={ticket.status} size="sm" />
                  </CardHeader>

                  <CardContent className="space-y-3 pt-3.5">
                    {/* Service Title */}
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base text-slate-900 leading-snug">
                        {ticket.serviceTitle || ticket.service?.name}
                      </CardTitle>
                      {ticket.quantity > 1 && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-medium ml-2 flex-shrink-0">
                          x{ticket.quantity}
                        </span>
                      )}
                    </div>

                    {/* Room & Assignment Information */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                      <div className="flex items-center text-slate-700">
                        <Bed className="w-3.5 h-3.5 text-indigo-600 mr-1.5 flex-shrink-0" />
                        <span className="font-mono font-medium">
                          Room {ticket.room?.roomNumber || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center text-slate-700 truncate">
                        <User className="w-3.5 h-3.5 text-indigo-600 mr-1.5 flex-shrink-0" />
                        <span className="truncate">
                          {isAssignedToMe
                            ? 'Assigned: You'
                            : isUnassigned
                            ? 'Unassigned'
                            : `Assigned: ${ticket.assignedStaff?.name || 'Staff'}`}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {ticket.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        "{ticket.description}"
                      </p>
                    )}

                    {/* Special Instructions Alert */}
                    {ticket.specialInstructions && (
                      <div className="text-[11px] text-amber-900 bg-amber-50/90 p-2 rounded-lg border border-amber-200/80 flex items-start space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Special Instructions:</strong> {ticket.specialInstructions}</span>
                      </div>
                    )}

                    {/* Timing details */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Submitted: {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {ticket.preferredTime && (
                        <span className="text-indigo-600 font-medium">
                          Pref: {new Date(ticket.preferredTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <CardFooter className="justify-between bg-white border-t border-slate-100 py-3">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleViewDetails(ticket)}
                      icon={Eye}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleOpenNoteModal(ticket)}
                      icon={MessageSquare}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Note
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Step 1: Accept */}
                    {ticket.status === REQUEST_STATUS.ASSIGNED && isAssignedToMe && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(ticketId)}
                        disabled={actionLoadingId === ticketId || !isOnDuty}
                        isLoading={actionLoadingId === ticketId}
                        icon={CheckCircle2}
                      >
                        Accept
                      </Button>
                    )}

                    {/* Step 2: Start Work */}
                    {ticket.status === REQUEST_STATUS.ACCEPTED && isAssignedToMe && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStart(ticketId)}
                        disabled={actionLoadingId === ticketId}
                        isLoading={actionLoadingId === ticketId}
                        icon={Play}
                        className="bg-violet-600 hover:bg-violet-700 shadow-violet-500/20"
                      >
                        Start Work
                      </Button>
                    )}

                    {/* Step 3: Complete Work */}
                    {ticket.status === REQUEST_STATUS.IN_PROGRESS && isAssignedToMe && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleOpenCompleteModal(ticket)}
                        disabled={actionLoadingId === ticketId}
                        icon={CheckSquare}
                      >
                        Complete
                      </Button>
                    )}

                    {/* Status badges when non-actionable */}
                    {ticket.status === REQUEST_STATUS.COMPLETED && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        Awaiting Confirmation
                      </span>
                    )}

                    {ticket.status === REQUEST_STATUS.CONFIRMED && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        Service Confirmed
                      </span>
                    )}

                    {isUnassigned && ticket.status === REQUEST_STATUS.PENDING && (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        Awaiting Dispatch
                      </span>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Operational Audit Note Modal */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Add Operational Work Note"
        description="Work notes are appended to the immutable RequestHistory audit trail."
        size="md"
      >
        <form onSubmit={handleSubmitNote} className="space-y-4">
          <Textarea
            label="Work Note Description"
            rows={4}
            placeholder="e.g. Inspected room 304, delivered 2 additional towels, guest confirmed receipt."
            value={workNoteText}
            onChange={(e) => setWorkNoteText(e.target.value)}
            required
            helperText="Provide concise, objective operational notes visible in audit history."
          />

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteModalOpen(false)}
              disabled={noteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={noteSubmitting}
              loadingText="Appending..."
            >
              Save Work Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Request Modal with Optional Notes */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Service Request"
        description="Mark this service task as finished. The guest will be notified to confirm satisfaction."
        size="md"
      >
        <form onSubmit={handleConfirmComplete} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
            <p className="font-semibold">Ready to mark this request completed?</p>
            <p className="mt-0.5 text-emerald-800">
              The status will transition to COMPLETED. Final confirmation is securely acknowledged by the guest.
            </p>
          </div>

          <Textarea
            label="Completion Notes (Optional)"
            rows={3}
            placeholder="e.g. Work finished in accordance with hotel standards. Room checked."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompleteModalOpen(false)}
              disabled={completeSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              size="sm"
              isLoading={completeSubmitting}
              loadingText="Completing..."
              icon={CheckSquare}
            >
              Confirm Completion
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Details & Full Audit History Drawer / Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Request Details #${selectedTicket?.requestNumber || ''}`}
        description="Comprehensive request specifications, guest details, and immutable audit history."
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-5">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Service</span>
                <span className="font-semibold text-slate-800">{selectedTicket.serviceTitle || selectedTicket.service?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Room</span>
                <span className="font-semibold text-slate-800 font-mono">Room {selectedTicket.room?.roomNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Priority</span>
                <PriorityBadge priority={selectedTicket.priority} size="xs" />
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <StatusBadge status={selectedTicket.status} size="xs" />
              </div>
            </div>

            {/* Description & Instructions */}
            <div className="space-y-3 text-xs">
              {selectedTicket.description && (
                <div>
                  <h5 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Description</h5>
                  <p className="text-slate-800 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    {selectedTicket.description}
                  </p>
                </div>
              )}

              {selectedTicket.specialInstructions && (
                <div>
                  <h5 className="font-semibold text-amber-900 uppercase tracking-wider text-[11px] mb-1">Special Instructions</h5>
                  <p className="text-amber-950 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    {selectedTicket.specialInstructions}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                {selectedTicket.acceptedAt && <span>Accepted: {new Date(selectedTicket.acceptedAt).toLocaleTimeString()}</span>}
                {selectedTicket.startedAt && <span>Started: {new Date(selectedTicket.startedAt).toLocaleTimeString()}</span>}
                {selectedTicket.completedAt && <span>Completed: {new Date(selectedTicket.completedAt).toLocaleTimeString()}</span>}
                {selectedTicket.confirmedAt && <span>Confirmed: {new Date(selectedTicket.confirmedAt).toLocaleTimeString()}</span>}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="pt-3 border-t border-slate-200">
              <h5 className="font-semibold text-slate-800 text-xs flex items-center mb-3">
                <History className="w-4 h-4 text-indigo-600 mr-1.5" />
                Immutable Request History Trail
              </h5>

              {historyLoading ? (
                <div className="py-6 text-center">
                  <LoadingSpinner size="sm" message="Loading audit history..." />
                </div>
              ) : historyError ? (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{historyError}</p>
              ) : ticketHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No history records logged yet.</p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {ticketHistory.map((entry, idx) => (
                    <div key={entry._id || idx} className="relative text-xs">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          {entry.action || 'STATUS_UPDATE'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-slate-600 mt-0.5 bg-slate-50 p-2 rounded border border-slate-100 text-[11px]">
                          {entry.notes}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        By: {entry.performedBy?.name || 'Staff / System'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
