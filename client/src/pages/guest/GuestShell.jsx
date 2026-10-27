import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRequestRealtime } from '../../hooks/useRequestRealtime';
import { AppLayout } from '../../layouts';
import {
  Button,
  Input,
  Textarea,
  FormField,
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
  SkeletonLoader,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  FilterBar,
  Toast,
} from '../../components/common';
import {
  getRequests,
  createRequest,
  cancelRequest,
  confirmRequest,
  getServices,
  getRooms,
  createFeedback,
  getFeedbackByRequest,
  getRequestHistory,
} from '../../services/api';
import {
  Bed,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Send,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Grid,
  ListFilter,
  MessageSquare,
  Star,
  User,
  Phone,
  Calendar,
  Building,
  Check,
  History,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import { REQUEST_STATUS, REQUEST_PRIORITY, SERVICE_CATEGORIES } from '../../utils/constants';
import { validatePhone } from '../../utils/validators';

export default function GuestShell() {
  const { user, updateProfile } = useAuth();

  // Data States
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVariant, setToastVariant] = useState('success');

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState('CATALOG'); // 'CATALOG' | 'ACTIVE_REQUESTS' | 'ALL_REQUESTS'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Request Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [formData, setFormData] = useState({
    quantity: 1,
    priority: REQUEST_PRIORITY.NORMAL,
    description: '',
    specialInstructions: '',
    preferredTime: '',
  });

  // Action state for cancel / confirm
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Feedback State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTargetRequest, setFeedbackTargetRequest] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [existingFeedbackMap, setExistingFeedbackMap] = useState({});

  // History Details Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTargetRequest, setHistoryTargetRequest] = useState(null);
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Profile Drawer/Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Fetch initial guest data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [servicesData, requestsData, roomsData] = await Promise.all([
        getServices(),
        getRequests({ limit: 100 }),
        getRooms(),
      ]);

      setServices(servicesData || []);
      const reqList = requestsData?.data?.requests || [];
      setRequests(reqList);
      setRooms(roomsData || []);

      // Check feedback for confirmed requests
      const confirmedReqs = reqList.filter((r) => r.status === REQUEST_STATUS.CONFIRMED);
      const feedbackLookups = await Promise.allSettled(
        confirmedReqs.map((r) => getFeedbackByRequest(r._id || r.id))
      );
      const fbMap = {};
      feedbackLookups.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value?.data?.feedback) {
          const rId = confirmedReqs[idx]._id || confirmedReqs[idx].id;
          fbMap[rId] = res.value.data.feedback;
        }
      });
      setExistingFeedbackMap(fbMap);
    } catch (err) {
      setError(err.message || 'Failed to load guest services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update profile data state when user object updates
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Real-Time Socket Listener
  useRequestRealtime({
    onRequestUpdated: (updatedPayload) => {
      setRequests((prev) =>
        prev.map((r) => {
          const reqId = (r._id || r.id)?.toString();
          if (reqId === updatedPayload.requestId) {
            return {
              ...r,
              status: updatedPayload.status,
              assignedStaff: updatedPayload.assignedStaffId
                ? { _id: updatedPayload.assignedStaffId, name: updatedPayload.assignedStaffName }
                : r.assignedStaff,
              acceptedAt: updatedPayload.acceptedAt || r.acceptedAt,
              startedAt: updatedPayload.startedAt || r.startedAt,
              completedAt: updatedPayload.completedAt || r.completedAt,
              confirmedAt: updatedPayload.confirmedAt || r.confirmedAt,
              cancelledAt: updatedPayload.cancelledAt || r.cancelledAt,
            };
          }
          return r;
        })
      );

      setToastVariant('info');
      setToastMessage(
        `Live Update: Request #${updatedPayload.requestNumber} status changed to ${updatedPayload.status}!`
      );
      setTimeout(() => setToastMessage(null), 5000);
    },
    onRequestCreated: (newPayload) => {
      // Reconcile if belongs to this guest
      const currentUserId = (user?._id || user?.id)?.toString();
      if (newPayload.guestId === currentUserId) {
        fetchData();
      }
    },
  });

  // Open Request Modal for a Service
  const handleOpenRequestModal = (service) => {
    setSelectedService(service);
    setFormData({
      quantity: 1,
      priority: service.defaultPriority || REQUEST_PRIORITY.NORMAL,
      description: '',
      specialInstructions: '',
      preferredTime: '',
    });
    setIsModalOpen(true);
  };

  // Submit New Service Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    try {
      setSubmitting(true);
      setError(null);

      const parsedQty = parseInt(formData.quantity, 10);
      const safeQty = isNaN(parsedQty) || parsedQty < 1 ? 1 : Math.min(selectedService.maxQuantity || 5, parsedQty);

      const payload = {
        serviceId: selectedService._id || selectedService.id,
        quantity: selectedService.allowQuantity ? safeQty : 1,
        priority: formData.priority,
        description: formData.description.trim(),
        specialInstructions: formData.specialInstructions.trim(),
      };

      if (formData.preferredTime) {
        payload.preferredTime = new Date(formData.preferredTime).toISOString();
      }

      const res = await createRequest(payload);
      const newReq = res?.data?.request || res?.data;
      if (newReq) {
        setRequests((prev) => [newReq, ...prev]);
        setToastVariant('success');
        setToastMessage(`Request #${newReq.requestNumber || ''} created successfully!`);
        setTimeout(() => setToastMessage(null), 4000);
        setActiveTab('ACTIVE_REQUESTS');
      }

      setIsModalOpen(false);
      setSelectedService(null);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to submit service request');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Cancel Dialog
  const triggerCancelDialog = (requestId) => {
    setCancelTargetId(requestId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  // Execute Cancel Request Action
  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;

    try {
      setActionLoadingId(cancelTargetId);
      await cancelRequest(cancelTargetId, cancelReason || 'Cancelled by guest');
      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === cancelTargetId ? { ...r, status: REQUEST_STATUS.CANCELLED } : r
        )
      );
      setToastVariant('warning');
      setToastMessage('Request has been cancelled.');
      setTimeout(() => setToastMessage(null), 4000);
      setCancelModalOpen(false);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(`Error cancelling request: ${err.message}`);
    } finally {
      setActionLoadingId(null);
      setCancelTargetId(null);
    }
  };

  // Confirm Request Completion Action
  const handleConfirmRequest = async (request) => {
    const requestId = request._id || request.id;
    try {
      setActionLoadingId(requestId);
      await confirmRequest(requestId);
      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === requestId ? { ...r, status: REQUEST_STATUS.CONFIRMED } : r
        )
      );
      setToastVariant('success');
      setToastMessage('Thank you! Service delivery confirmed.');
      setTimeout(() => setToastMessage(null), 4000);

      // Immediately prompt for feedback
      setFeedbackTargetRequest(request);
      setFeedbackRating(5);
      setFeedbackComment('');
      setFeedbackModalOpen(true);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(`Error confirming request: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Feedback Modal
  const handleOpenFeedback = async (request) => {
    const rId = request._id || request.id;
    setFeedbackTargetRequest(request);

    // Check if feedback already exists
    if (existingFeedbackMap[rId]) {
      setFeedbackRating(existingFeedbackMap[rId].rating);
      setFeedbackComment(existingFeedbackMap[rId].comment || '');
    } else {
      setFeedbackRating(5);
      setFeedbackComment('');
    }
    setFeedbackModalOpen(true);
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackTargetRequest) return;

    const rId = feedbackTargetRequest._id || feedbackTargetRequest.id;
    try {
      setFeedbackSubmitting(true);
      const res = await createFeedback({
        requestId: rId,
        rating: feedbackRating,
        comment: feedbackComment.trim(),
      });

      if (res?.data?.feedback) {
        setExistingFeedbackMap((prev) => ({
          ...prev,
          [rId]: res.data.feedback,
        }));
        setToastVariant('success');
        setToastMessage('Thank you! Your feedback & rating have been recorded.');
        setTimeout(() => setToastMessage(null), 4000);
      }

      setFeedbackModalOpen(false);
      setFeedbackTargetRequest(null);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to submit feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // View Request History Timeline
  const handleViewHistory = async (request) => {
    const rId = request._id || request.id;
    setHistoryTargetRequest(request);
    setHistoryModalOpen(true);
    try {
      setHistoryLoading(true);
      const res = await getRequestHistory(rId);
      setHistoryTimeline(res?.data?.history || []);
    } catch (err) {
      setToastVariant('error');
      setToastMessage('Failed to load request timeline.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Update Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileData.phone) {
      const phoneErr = validatePhone(profileData.phone, false);
      if (phoneErr) {
        setToastVariant('error');
        setToastMessage(phoneErr);
        return;
      }
    }
    try {
      setProfileSubmitting(true);
      await updateProfile({
        name: profileData.name.trim(),
        phone: profileData.phone.trim(),
      });
      setToastVariant('success');
      setToastMessage('Guest profile updated successfully.');
      setTimeout(() => setToastMessage(null), 4000);
      setProfileModalOpen(false);
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err.message || 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Categorized & Filtered Services
  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'ALL' || srv.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered Requests
  const activeRequests = requests.filter((req) =>
    [
      REQUEST_STATUS.PENDING,
      REQUEST_STATUS.ASSIGNED,
      REQUEST_STATUS.ACCEPTED,
      REQUEST_STATUS.IN_PROGRESS,
      REQUEST_STATUS.COMPLETED,
    ].includes(req.status)
  );

  const completedRequests = requests.filter((req) =>
    [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CONFIRMED].includes(req.status)
  );

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'ACTIVE') {
      return [
        REQUEST_STATUS.PENDING,
        REQUEST_STATUS.ASSIGNED,
        REQUEST_STATUS.ACCEPTED,
        REQUEST_STATUS.IN_PROGRESS,
        REQUEST_STATUS.COMPLETED,
      ].includes(req.status);
    }
    if (statusFilter === 'COMPLETED') {
      return req.status === REQUEST_STATUS.COMPLETED;
    }
    if (statusFilter === 'CONFIRMED') {
      return req.status === REQUEST_STATUS.CONFIRMED;
    }
    if (statusFilter === 'CANCELLED') {
      return req.status === REQUEST_STATUS.CANCELLED;
    }
    return true;
  });

  // Stepper progress value (1 to 5)
  const getStepNumber = (status) => {
    switch (status) {
      case REQUEST_STATUS.PENDING:
        return 1;
      case REQUEST_STATUS.ASSIGNED:
        return 2;
      case REQUEST_STATUS.ACCEPTED:
      case REQUEST_STATUS.IN_PROGRESS:
        return 3;
      case REQUEST_STATUS.COMPLETED:
        return 4;
      case REQUEST_STATUS.CONFIRMED:
        return 5;
      default:
        return 0;
    }
  };

  // Resolved Room Details
  const assignedRoom =
    (typeof user?.room === 'object' && user?.room !== null)
      ? user.room
      : (rooms.find((r) => String(r._id || r.id) === String(user?.room)) || user?.room || rooms[0]);
  const roomNumberDisplay = assignedRoom?.roomNumber ? `Room ${assignedRoom.roomNumber}` : 'Room 201';
  const roomTypeDisplay = assignedRoom?.roomType ? assignedRoom.roomType.replace('_', ' ') : 'Deluxe Suite';
  const floorDisplay = assignedRoom?.floor ? `Floor ${assignedRoom.floor}` : 'Floor 1';

  // Navigation Items for AppLayout
  const navItems = [
    {
      id: 'CATALOG',
      label: 'Service Catalog',
      icon: Grid,
    },
    {
      id: 'ACTIVE_REQUESTS',
      label: 'Active Tracking',
      icon: Sparkles,
      badge: activeRequests.length,
    },
    {
      id: 'ALL_REQUESTS',
      label: 'Request History',
      icon: Clock,
      badge: requests.length,
    },
  ];

  if (loading && services.length === 0) {
    return (
      <AppLayout portalName="Guest Portal" navItems={navItems} activeNav={activeTab}>
        <div className="py-12">
          <LoadingSpinner size="lg" message="Loading guest suite, live catalog & requests..." />
        </div>
      </AppLayout>
    );
  }

  if (error && services.length === 0) {
    return (
      <AppLayout portalName="Guest Portal" navItems={navItems} activeNav={activeTab}>
        <ErrorState
          title="Failed to Load Guest Services"
          message={error}
          onRetry={fetchData}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      portalName="Guest Portal"
      navItems={navItems}
      activeNav={activeTab}
      onNavChange={setActiveTab}
      headerActions={
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProfileModalOpen(true)}
            icon={User}
            aria-label="Guest Profile"
          >
            <span className="hidden sm:inline">My Stay</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            icon={RefreshCw}
            aria-label="Refresh Data"
          >
            <span className="hidden sm:inline">Sync</span>
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

      {/* Guest Stay Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Verified Guest &bull; {roomTypeDisplay}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Order room service, housekeeping, maintenance, or transportation with real-time tracking directly to your suite.
            </p>
          </div>

          <div
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center space-x-4 bg-white/10 hover:bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm transition cursor-pointer"
            title="Click to view stay details"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bed className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-semibold">
                Assigned Suite &bull; {floorDisplay}
              </span>
              <span className="text-xl font-bold text-white block font-mono">{roomNumberDisplay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW: ACTIVE TRACKING OR ALL REQUESTS */}
      {(activeTab === 'ACTIVE_REQUESTS' || activeTab === 'ALL_REQUESTS') && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <Sparkles className="w-5 h-5 text-indigo-600 mr-2" />
                {activeTab === 'ACTIVE_REQUESTS' ? 'Active Service Tracking' : 'Guest Request History'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time updates synchronize automatically with hotel staff
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={statusFilter === 'ALL' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
              >
                All ({requests.length})
              </Button>
              <Button
                variant={statusFilter === 'ACTIVE' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ACTIVE')}
              >
                Active ({activeRequests.length})
              </Button>
              <Button
                variant={statusFilter === 'COMPLETED' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === 'CONFIRMED' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                Confirmed
              </Button>
              <Button
                variant={statusFilter === 'CANCELLED' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('CANCELLED')}
              >
                Cancelled
              </Button>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No service requests found"
              description="Browse our service catalog and order any hotel service with live tracking."
              action={
                <Button
                  variant="primary"
                  onClick={() => setActiveTab('CATALOG')}
                  icon={Grid}
                >
                  Browse Catalog
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredRequests.map((req) => {
                const reqId = req._id || req.id;
                const step = getStepNumber(req.status);
                const isCancelled = req.status === REQUEST_STATUS.CANCELLED;
                const feedbackRecord = existingFeedbackMap[reqId];

                return (
                  <Card key={reqId} className="flex flex-col justify-between overflow-hidden">
                    <div>
                      {/* Card Header */}
                      <CardHeader className="bg-slate-50/50">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            #{req.requestNumber}
                          </span>
                          <Badge variant="indigo">{req.category}</Badge>
                          <PriorityBadge priority={req.priority} size="sm" />
                        </div>
                        <StatusBadge status={req.status} size="sm" />
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div>
                          <CardTitle className="text-lg">{req.serviceTitle}</CardTitle>
                          {req.description && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              "{req.description}"
                            </p>
                          )}
                          {req.specialInstructions && (
                            <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                              <strong>Delivery note:</strong> {req.specialInstructions}
                            </p>
                          )}
                        </div>

                        {/* Interactive Lifecycle Stepper (Timeline Tracker) */}
                        {!isCancelled ? (
                          <div className="pt-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Service Delivery Progress</span>
                              <span className="text-indigo-600 font-semibold">
                                Step {step} of 5 &bull; {req.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-5 gap-1.5 text-center">
                              {[
                                { num: 1, label: 'Pending' },
                                { num: 2, label: 'Assigned' },
                                { num: 3, label: 'In Progress' },
                                { num: 4, label: 'Completed' },
                                { num: 5, label: 'Confirmed' },
                              ].map((s) => (
                                <div key={s.num} className="flex flex-col items-center">
                                  <div
                                    className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                                      step >= s.num
                                        ? 'bg-indigo-600'
                                        : 'bg-slate-200'
                                    }`}
                                  />
                                  <span
                                    className={`text-[9px] mt-1.5 font-medium truncate w-full ${
                                      step >= s.num
                                        ? 'text-indigo-700 font-bold'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {s.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 flex items-start">
                            <XCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-rose-600" />
                            <div>
                              <strong className="block">Request Cancelled</strong>
                              <span>{req.cancellationReason || 'Cancelled upon guest request.'}</span>
                            </div>
                          </div>
                        )}

                        {/* Existing Feedback Badge if Submitted */}
                        {feedbackRecord && (
                          <div className="bg-amber-50/60 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-amber-900">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="font-bold">Your Rating: {feedbackRecord.rating} / 5</span>
                            </div>
                            <span className="text-[11px] text-amber-700 italic truncate max-w-[200px]">
                              "{feedbackRecord.comment || 'No comment'}"
                            </span>
                          </div>
                        )}

                        {/* Assigned Staff and Meta Strip */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              Staff:{' '}
                              <strong className="text-slate-700">
                                {req.assignedStaff?.name || 'Awaiting assignment'}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {req.createdAt
                                ? new Date(req.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    {/* Card Actions Footer */}
                    <CardFooter className="justify-between">
                      <div className="flex items-center space-x-2">
                        {/* Cancel Action */}
                        {[REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED].includes(req.status) && (
                          <Button
                            variant="dangerOutline"
                            size="xs"
                            onClick={() => triggerCancelDialog(reqId)}
                            disabled={actionLoadingId === reqId}
                            icon={XCircle}
                          >
                            Cancel
                          </Button>
                        )}

                        {/* History Timeline Button */}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleViewHistory(req)}
                          icon={History}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Audit Log
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Guest Confirmation CTA */}
                        {req.status === REQUEST_STATUS.COMPLETED && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleConfirmRequest(req)}
                            isLoading={actionLoadingId === reqId}
                            icon={CheckCircle2}
                            className="shadow-md shadow-emerald-500/20"
                          >
                            Confirm Delivery
                          </Button>
                        )}

                        {/* Leave / View Feedback Button */}
                        {req.status === REQUEST_STATUS.CONFIRMED && (
                          <Button
                            variant={feedbackRecord ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleOpenFeedback(req)}
                            icon={Star}
                            className={
                              feedbackRecord
                                ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-sm'
                            }
                          >
                            {feedbackRecord ? 'View Feedback' : 'Rate Service'}
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* VIEW: CATALOG BROWSER */}
      {activeTab === 'CATALOG' && (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                <Grid className="w-5 h-5 text-indigo-600 mr-2" />
                Hotel Service Catalog
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse on-demand hotel services and request straight to {roomNumberDisplay}
              </p>
            </div>

            <div className="w-full md:w-72">
              <SearchInput
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {['ALL', ...Object.values(SERVICE_CATEGORIES)].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Service Cards Grid */}
          {filteredServices.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No services match your search"
              description="Try selecting another category or clearing your search term."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((service) => {
                const srvId = service._id || service.id;
                return (
                  <Card
                    key={srvId}
                    interactive
                    className="flex flex-col justify-between group"
                  >
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="indigo">
                          {service.category.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500 flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          ~{service.estimatedDurationMinutes || 30}m
                        </span>
                      </div>

                      <div>
                        <CardTitle className="group-hover:text-indigo-600 transition-colors">
                          {service.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {service.description || 'Standard hotel guest service request available 24/7.'}
                        </CardDescription>
                      </div>
                    </CardContent>

                    <CardFooter className="justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {service.price && service.price > 0 ? `₹${service.price}` : 'Complimentary'}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenRequestModal(service)}
                        icon={PlusCircle}
                      >
                        Request
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* REQUEST SERVICE MODAL */}
      <Modal
        isOpen={isModalOpen && Boolean(selectedService)}
        onClose={() => setIsModalOpen(false)}
        title={selectedService?.name || 'Request Hotel Service'}
        description={`Delivering directly to ${roomNumberDisplay}`}
        size="md"
      >
        {selectedService && (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {selectedService.price && selectedService.price > 0 ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                <span className="font-medium text-slate-700">Estimated Cost:</span>
                <span className="font-bold text-indigo-700 text-sm">
                  ₹{selectedService.price * (formData.quantity || 1)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                <span className="font-medium text-emerald-800">Pricing:</span>
                <span className="font-bold text-emerald-700">Complimentary Service</span>
              </div>
            )}

            {/* Quantity */}
            {selectedService.allowQuantity && (
              <FormField
                label={`Quantity (Max ${selectedService.maxQuantity || 5})`}
                required
                helperText={`Type manually or use - / + controls (1 to ${selectedService.maxQuantity || 5})`}
              >
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(formData.quantity, 10) || 1;
                      if (cur > 1) {
                        setFormData((prev) => ({ ...prev, quantity: cur - 1 }));
                      }
                    }}
                    disabled={(parseInt(formData.quantity, 10) || 1) <= 1}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 transition active:scale-95 shadow-sm"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <Input
                    type="number"
                    min="1"
                    max={selectedService.maxQuantity || 5}
                    value={formData.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setFormData((prev) => ({ ...prev, quantity: '' }));
                        return;
                      }
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        const max = selectedService.maxQuantity || 5;
                        setFormData((prev) => ({
                          ...prev,
                          quantity: num > max ? max : num < 1 ? 1 : num,
                        }));
                      }
                    }}
                    onBlur={() => {
                      const max = selectedService.maxQuantity || 5;
                      const num = parseInt(formData.quantity, 10);
                      if (!num || num < 1) {
                        setFormData((prev) => ({ ...prev, quantity: 1 }));
                      } else if (num > max) {
                        setFormData((prev) => ({ ...prev, quantity: max }));
                      }
                    }}
                    className="w-28"
                    inputClassName="text-center font-semibold text-base py-2"
                    placeholder="1"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const max = selectedService.maxQuantity || 5;
                      const cur = parseInt(formData.quantity, 10) || 1;
                      if (cur < max) {
                        setFormData((prev) => ({ ...prev, quantity: cur + 1 }));
                      }
                    }}
                    disabled={(parseInt(formData.quantity, 10) || 1) >= (selectedService.maxQuantity || 5)}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 transition active:scale-95 shadow-sm"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </FormField>
            )}

            {/* Priority Picker */}
            <FormField label="Urgency / Priority">
              <div className="grid grid-cols-4 gap-2">
                {Object.values(REQUEST_PRIORITY).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      formData.priority === p
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </FormField>

            {/* Preferred Delivery Time (Optional) */}
            <Input
              label="Preferred Delivery Time (Optional)"
              type="datetime-local"
              value={formData.preferredTime}
              onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
            />

            {/* Description */}
            <Textarea
              label="Request Details"
              rows={3}
              placeholder="e.g. Please bring 2 extra bath towels and a fresh bottle of water"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            {/* Special Instructions */}
            <Input
              label="Delivery Instructions (Optional)"
              placeholder="e.g. Please knock softly, baby is sleeping"
              value={formData.specialInstructions}
              onChange={(e) =>
                setFormData({ ...formData, specialInstructions: e.target.value })
              }
            />

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                loadingText="Submitting..."
                icon={Send}
              >
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRM CANCELLATION DIALOG */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Service Request"
        description="Are you sure you want to cancel this request?"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Reason for cancellation (optional)"
            placeholder="e.g. No longer needed"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={Boolean(actionLoadingId)}
            >
              Keep Request
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
              isLoading={Boolean(actionLoadingId)}
              loadingText="Cancelling..."
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* FEEDBACK & RATING MODAL */}
      <Modal
        isOpen={feedbackModalOpen && Boolean(feedbackTargetRequest)}
        onClose={() => setFeedbackModalOpen(false)}
        title={
          existingFeedbackMap[feedbackTargetRequest?._id || feedbackTargetRequest?.id]
            ? 'Your Service Feedback'
            : 'Rate & Review Service'
        }
        description={`Request #${feedbackTargetRequest?.requestNumber} &bull; ${feedbackTargetRequest?.serviceTitle}`}
        size="md"
      >
        {feedbackTargetRequest && (
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            {/* Interactive Star Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Service Rating (1 to 5 Stars) *
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= feedbackRating;
                  const isReadOnly = Boolean(
                    existingFeedbackMap[feedbackTargetRequest._id || feedbackTargetRequest.id]
                  );
                  return (
                    <button
                      key={starValue}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setFeedbackRating(starValue)}
                      className={`p-1.5 rounded-xl transition ${
                        isReadOnly ? 'cursor-default' : 'hover:scale-110 active:scale-95'
                      }`}
                      aria-label={`${starValue} Stars`}
                    >
                      <Star
                        className={`w-7 h-7 ${
                          isFilled
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="text-sm font-bold text-slate-700 ml-2">
                  {feedbackRating} / 5 Stars
                </span>
              </div>
            </div>

            {/* Comment Area */}
            <Textarea
              label="Review / Feedback Comment"
              rows={3}
              placeholder="How was the service provided? Any special praise or area for improvement?"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              disabled={Boolean(
                existingFeedbackMap[feedbackTargetRequest._id || feedbackTargetRequest.id]
              )}
              helperText={`${feedbackComment.length}/1000 characters`}
            />

            {/* Submit CTA */}
            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedbackModalOpen(false)}
                disabled={feedbackSubmitting}
              >
                Close
              </Button>
              {!existingFeedbackMap[feedbackTargetRequest._id || feedbackTargetRequest.id] && (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={feedbackSubmitting}
                  loadingText="Submitting..."
                  icon={Star}
                >
                  Submit Rating
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* REQUEST HISTORY TIMELINE MODAL */}
      <Modal
        isOpen={historyModalOpen && Boolean(historyTargetRequest)}
        onClose={() => setHistoryModalOpen(false)}
        title={`Audit Trail: #${historyTargetRequest?.requestNumber}`}
        description="Immutable lifecycle events & transition timestamps"
        size="lg"
      >
        {historyLoading ? (
          <LoadingSpinner size="md" message="Loading request timeline logs..." />
        ) : historyTimeline.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No audit entries"
            description="No transition logs have been recorded for this ticket yet."
          />
        ) : (
          <div className="space-y-4">
            <div className="flow-root">
              <ul className="-mb-8">
                {historyTimeline.map((entry, idx) => {
                  const isLast = idx === historyTimeline.length - 1;
                  return (
                    <li key={entry._id || idx}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center ring-8 ring-white text-indigo-600 font-bold text-xs">
                              {entry.toStatus ? entry.toStatus.charAt(0) : 'T'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                Transition:{' '}
                                <span className="text-slate-500 font-medium">
                                  {entry.fromStatus || 'INIT'}
                                </span>{' '}
                                &rarr;{' '}
                                <span className="text-indigo-600 font-bold">
                                  {entry.toStatus}
                                </span>
                              </p>
                              {entry.action && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  Action: <strong>{entry.action}</strong>
                                </p>
                              )}
                              {entry.notes && (
                                <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  "{entry.notes}"
                                </p>
                              )}
                              {entry.performedBy && (
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Recorded by: {entry.performedBy.name || 'System Operator'}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-[11px] whitespace-nowrap text-slate-400">
                              {new Date(entry.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* GUEST STAY & PROFILE MODAL */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Guest Stay & Profile Information"
        description="Verified stay details & guest contact information"
        size="md"
      >
        <div className="space-y-5">
          {/* Room Suite Info Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Current Assigned Room
              </span>
              <Badge variant="emerald" dot>
                Checked In
              </Badge>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">
              {roomNumberDisplay}
            </div>
            <div className="text-xs text-slate-600 flex items-center space-x-3">
              <span>{roomTypeDisplay}</span>
              <span>&bull;</span>
              <span>{floorDisplay}</span>
              <span>&bull;</span>
              <span>Standard Hotel Guest Tier</span>
            </div>
          </div>

          {/* Editable Contact Info Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              required
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              icon={User}
            />

            <Input
              label="Email Address (Read Only)"
              type="email"
              disabled
              value={user?.email || ''}
              helperText="Email cannot be changed directly."
            />

            <Input
              label="Contact Phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              icon={Phone}
              helperText="Used by hotel staff for service arrival updates."
            />

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProfileModalOpen(false)}
                disabled={profileSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={profileSubmitting}
                loadingText="Saving..."
              >
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </AppLayout>
  );
}
