import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRequestRealtime } from '../../hooks/useRequestRealtime';
import { AppLayout } from '../../layouts';
import {
  Button,
  Select,
  FormField,
  Input,
  Textarea,
  Badge,
  StatusBadge,
  PriorityBadge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Modal,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
  PageHeader,
  SearchInput,
  FilterBar,
  ResponsiveTable,
  Toast,
} from '../../components/common';
import {
  getRequests,
  assignRequest,
  updateRequestPriority,
  cancelRequest,
  getRequestHistory,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getServices,
  createService,
  updateService,
  deleteService,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getStaffDirectory,
  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
} from '../../services/api';
import {
  ShieldAlert,
  Users,
  Layers,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Bed,
  RefreshCw,
  X,
  History,
  Send,
  AlertTriangle,
  Activity,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  Building,
  Sparkles,
  Home,
  Check,
  Ban,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import {
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  USER_ROLES,
  SERVICE_CATEGORIES,
  ROOM_TYPE,
  ROOM_STATUS,
} from '../../utils/constants';
import { validateEmail, validatePhone } from '../../utils/validators';

export default function AdminShell() {
  const { user } = useAuth();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users' | 'departments' | 'services' | 'rooms'

  // Master Data Collections
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [services, setServices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Request Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [requestSearch, setRequestSearch] = useState('');

  // User Filters
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Catalog / Inventory Filters
  const [deptSearch, setDeptSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('ALL');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFloorFilter, setRoomFloorFilter] = useState('ALL');

  // Modals & Action States
  // 1. Assign / Reassign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // 2. Priority Override Modal
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [newPriority, setNewPriority] = useState('URGENT');
  const [priorityReason, setPriorityReason] = useState('');
  const [priorityUpdating, setPriorityUpdating] = useState(false);

  // 3. Cancel Ticket Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // 4. History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 5. User Creation Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: USER_ROLES.STAFF,
    department: '',
    room: '',
    isOnDuty: true,
  });
  const [userSubmitting, setUserSubmitting] = useState(false);

  // 5b. User Role & Department Edit Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUserForRole, setEditingUserForRole] = useState(null);
  const [roleTargetRole, setRoleTargetRole] = useState(USER_ROLES.STAFF);
  const [roleTargetDept, setRoleTargetDept] = useState('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // 6. Department Modal (Create / Edit)
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'Building',
  });
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  // 7. Service Modal (Create / Edit)
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    code: '',
    category: SERVICE_CATEGORIES.HOUSEKEEPING,
    department: '',
    description: '',
    defaultPriority: REQUEST_PRIORITY.NORMAL,
    estimatedDurationMinutes: 30,
    allowQuantity: false,
    maxQuantity: 5,
    price: 0,
  });
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // 8. Room Modal (Create / Edit)
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    roomNumber: '',
    floor: 1,
    roomType: ROOM_TYPE.STANDARD,
    status: ROOM_STATUS.AVAILABLE,
    currentGuest: '',
  });
  const [roomSubmitting, setRoomSubmitting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVariant, setToastVariant] = useState('success');

  const showToast = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------------------
  // INITIAL DATA LOADING
  // ----------------------------------------------------
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, depts, servs, rms, staff, users] = await Promise.all([
        getRequests({ limit: 100 }),
        getDepartments({ includeInactive: true }),
        getServices({ includeInactive: true }),
        getRooms({ includeInactive: true }),
        getStaffDirectory(),
        getUsers(),
      ]);

      setRequests(reqRes?.data?.requests || []);
      setDepartments(depts || []);
      setServices(servs || []);
      setRooms(rms || []);
      setStaffList(staff || []);
      setUsersList(users || []);
    } catch (err) {
      console.warn('Failed to load admin data:', err.message);
      showToast(`Data load warning: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ----------------------------------------------------
  // REAL-TIME WEBSOCKET LISTENER
  // ----------------------------------------------------
  useRequestRealtime({
    onRequestCreated: (newReq) => {
      // Prepend or re-fetch to maintain up-to-date counts
      setRequests((prev) => {
        const exists = prev.some((r) => (r._id || r.id) === (newReq._id || newReq.id));
        if (exists) return prev;
        return [newReq, ...prev];
      });
      showToast(`Live Alert: New ticket #${newReq.requestNumber} dispatched!`, 'info');
    },
    onRequestUpdated: (updatedPayload) => {
      setRequests((prev) =>
        prev.map((r) => {
          const reqId = (r._id || r.id)?.toString();
          if (reqId === updatedPayload.requestId) {
            return {
              ...r,
              status: updatedPayload.status || r.status,
              priority: updatedPayload.priority || r.priority,
              assignedStaff: updatedPayload.assignedStaffId
                ? { _id: updatedPayload.assignedStaffId, name: updatedPayload.assignedStaffName }
                : r.assignedStaff,
            };
          }
          return r;
        })
      );
    },
  });

  // ----------------------------------------------------
  // OPERATIONAL KPI METRICS
  // ----------------------------------------------------
  const totalTickets = requests.length;
  const pendingCount = requests.filter((r) => r.status === REQUEST_STATUS.PENDING).length;
  const assignedCount = requests.filter((r) => r.status === REQUEST_STATUS.ASSIGNED).length;
  const inProgressCount = requests.filter((r) =>
    [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
  ).length;
  const urgentCount = requests.filter((r) => r.priority === REQUEST_PRIORITY.URGENT).length;
  const completedCount = requests.filter((r) =>
    [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CONFIRMED].includes(r.status)
  ).length;
  const cancelledCount = requests.filter((r) => r.status === REQUEST_STATUS.CANCELLED).length;

  // ----------------------------------------------------
  // REQUEST ACTIONS (Assign, Priority, Cancel, History)
  // ----------------------------------------------------
  const handleOpenAssignModal = (ticket) => {
    setSelectedTicket(ticket);
    const deptId = (ticket.department?._id || ticket.department)?.toString();
    const eligible = staffList.filter((s) => {
      const sDept = (s.department?._id || s.department)?.toString();
      return sDept === deptId;
    });
    setSelectedStaffId(ticket.assignedStaff?._id || eligible[0]?._id || '');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !selectedStaffId) return;

    try {
      setAssigning(true);
      const ticketId = selectedTicket._id || selectedTicket.id;
      const res = await assignRequest(ticketId, selectedStaffId);
      const updatedReq = res?.data?.request;

      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === ticketId
            ? updatedReq || {
                ...r,
                status: REQUEST_STATUS.ASSIGNED,
                assignedStaff: staffList.find((s) => (s._id || s.id) === selectedStaffId),
              }
            : r
        )
      );

      showToast(`Ticket #${selectedTicket.requestNumber} successfully assigned.`);
      setAssignModalOpen(false);
    } catch (err) {
      showToast(`Assignment failed: ${err.message}`, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenPriorityModal = (ticket) => {
    setSelectedTicket(ticket);
    setNewPriority(ticket.priority || REQUEST_PRIORITY.URGENT);
    setPriorityReason('');
    setPriorityModalOpen(true);
  };

  const handlePrioritySubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setPriorityUpdating(true);
      const ticketId = selectedTicket._id || selectedTicket.id;
      const res = await updateRequestPriority(ticketId, newPriority, priorityReason);
      const updatedReq = res?.data?.request;

      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === ticketId ? updatedReq || { ...r, priority: newPriority } : r
        )
      );

      showToast(`Priority for #${selectedTicket.requestNumber} escalated to ${newPriority}.`);
      setPriorityModalOpen(false);
    } catch (err) {
      showToast(`Priority override failed: ${err.message}`, 'error');
    } finally {
      setPriorityUpdating(false);
    }
  };

  const handleOpenCancelModal = (ticket) => {
    setSelectedTicket(ticket);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setCancelling(true);
      const ticketId = selectedTicket._id || selectedTicket.id;
      const res = await cancelRequest(ticketId, cancelReason);
      const updatedReq = res?.data?.request;

      setRequests((prev) =>
        prev.map((r) =>
          (r._id || r.id) === ticketId
            ? updatedReq || { ...r, status: REQUEST_STATUS.CANCELLED }
            : r
        )
      );

      showToast(`Ticket #${selectedTicket.requestNumber} cancelled.`);
      setCancelModalOpen(false);
    } catch (err) {
      showToast(`Cancellation failed: ${err.message}`, 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenHistory = async (ticket) => {
    try {
      setSelectedTicket(ticket);
      setHistoryModalOpen(true);
      setHistoryLoading(true);
      const res = await getRequestHistory(ticket._id || ticket.id);
      setHistoryList(res?.data?.history || []);
    } catch (err) {
      showToast(`History retrieval error: ${err.message}`, 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ----------------------------------------------------
  // USER MANAGEMENT ACTIONS
  // ----------------------------------------------------
  const handleOpenCreateUserModal = () => {
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: USER_ROLES.STAFF,
      department: departments[0]?._id || '',
      room: rooms[0]?._id || '',
      isOnDuty: true,
    });
    setUserModalOpen(true);
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(userFormData.email);
    if (emailErr) {
      showToast(emailErr, 'error');
      return;
    }

    if (userFormData.phone) {
      const phoneErr = validatePhone(userFormData.phone, false);
      if (phoneErr) {
        showToast(phoneErr, 'error');
        return;
      }
    }

    try {
      setUserSubmitting(true);
      const payload = {
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        phone: userFormData.phone.trim(),
        password: userFormData.password,
        role: userFormData.role,
        department: userFormData.role === USER_ROLES.STAFF ? userFormData.department : null,
        room: userFormData.role === USER_ROLES.GUEST ? userFormData.room : null,
        isOnDuty: userFormData.role === USER_ROLES.STAFF ? userFormData.isOnDuty : false,
      };

      const newUser = await createUser(payload);
      setUsersList((prev) => [newUser, ...prev]);

      // If staff, also add to staffList
      if (newUser.role === USER_ROLES.STAFF) {
        setStaffList((prev) => [newUser, ...prev]);
      }

      showToast(`Account created for ${newUser.name} (${newUser.role}).`);
      setUserModalOpen(false);
    } catch (err) {
      showToast(`Failed to create user: ${err.message}`, 'error');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserActive = async (targetUser) => {
    try {
      const nextActive = !targetUser.isActive;
      const updated = await updateUserStatus(targetUser._id, { isActive: nextActive });

      setUsersList((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isActive: nextActive } : u))
      );
      setStaffList((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isActive: nextActive } : u))
      );

      showToast(`User ${targetUser.name} is now ${nextActive ? 'Active' : 'Deactivated'}.`);
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleToggleStaffDuty = async (targetUser) => {
    try {
      const nextDuty = !targetUser.isOnDuty;
      const updated = await updateUserStatus(targetUser._id, { isOnDuty: nextDuty });

      setUsersList((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isOnDuty: nextDuty } : u))
      );
      setStaffList((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isOnDuty: nextDuty } : u))
      );

      showToast(`${targetUser.name} duty status toggled to ${nextDuty ? 'On Duty' : 'Off Duty'}.`);
    } catch (err) {
      showToast(`Failed to update duty status: ${err.message}`, 'error');
    }
  };

  const handleOpenRoleModal = (targetUser) => {
    setEditingUserForRole(targetUser);
    setRoleTargetRole(targetUser.role || USER_ROLES.STAFF);
    setRoleTargetDept(targetUser.department?._id || (departments[0]?._id || ''));
    setRoleModalOpen(true);
  };

  const handleSaveUserRole = async (e) => {
    e.preventDefault();
    if (!editingUserForRole) return;
    try {
      setRoleSubmitting(true);
      const payload = {
        role: roleTargetRole,
        department: roleTargetRole === USER_ROLES.STAFF ? roleTargetDept : null,
      };

      const updated = await updateUserRole(editingUserForRole._id, payload);
      setUsersList((prev) =>
        prev.map((u) => (u._id === updated._id ? updated : u))
      );

      if (updated.role === USER_ROLES.STAFF) {
        setStaffList((prev) => {
          const exists = prev.some((s) => s._id === updated._id);
          return exists ? prev.map((s) => (s._id === updated._id ? updated : s)) : [updated, ...prev];
        });
      } else {
        setStaffList((prev) => prev.filter((s) => s._id !== updated._id));
      }

      showToast(`Updated role for ${updated.name} to ${updated.role}.`);
      setRoleModalOpen(false);
    } catch (err) {
      showToast(`Failed to update role: ${err.message}`, 'error');
    } finally {
      setRoleSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // DEPARTMENT MANAGEMENT ACTIONS
  // ----------------------------------------------------
  const handleOpenDeptModal = (dept = null) => {
    setEditingDept(dept);
    if (dept) {
      setDeptFormData({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        icon: dept.icon || 'Building',
      });
    } else {
      setDeptFormData({
        name: '',
        code: '',
        description: '',
        icon: 'Building',
      });
    }
    setDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      setDeptSubmitting(true);
      if (editingDept) {
        const updated = await updateDepartment(editingDept._id, deptFormData);
        setDepartments((prev) => prev.map((d) => (d._id === editingDept._id ? updated : d)));
        showToast(`Department "${updated.name}" updated.`);
      } else {
        const created = await createDepartment(deptFormData);
        setDepartments((prev) => [...prev, created]);
        showToast(`Department "${created.name}" created.`);
      }
      setDeptModalOpen(false);
    } catch (err) {
      showToast(`Department operation failed: ${err.message}`, 'error');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate department "${dept.name}"?`)) {
      return;
    }
    try {
      const res = await deleteDepartment(dept._id);
      if (res?.data?.softDeleted) {
        setDepartments((prev) =>
          prev.map((d) => (d._id === dept._id ? { ...d, isActive: false } : d))
        );
        showToast(`Department deactivated to preserve historical links.`);
      } else {
        setDepartments((prev) => prev.filter((d) => d._id !== dept._id));
        showToast(`Department deleted successfully.`);
      }
    } catch (err) {
      showToast(`Department removal failed: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // SERVICE CATALOG MANAGEMENT ACTIONS
  // ----------------------------------------------------
  const handleOpenServiceModal = (svc = null) => {
    setEditingService(svc);
    if (svc) {
      setServiceFormData({
        name: svc.name,
        code: svc.code,
        category: svc.category,
        department: svc.department?._id || svc.department || departments[0]?._id,
        description: svc.description || '',
        defaultPriority: svc.defaultPriority || REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: svc.estimatedDurationMinutes || 30,
        allowQuantity: Boolean(svc.allowQuantity),
        maxQuantity: svc.maxQuantity || 5,
        price: svc.price || 0,
      });
    } else {
      setServiceFormData({
        name: '',
        code: '',
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: departments[0]?._id || '',
        description: '',
        defaultPriority: REQUEST_PRIORITY.NORMAL,
        estimatedDurationMinutes: 30,
        allowQuantity: false,
        maxQuantity: 5,
        price: 0,
      });
    }
    setServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      setServiceSubmitting(true);
      const payload = {
        ...serviceFormData,
        estimatedDurationMinutes: parseInt(serviceFormData.estimatedDurationMinutes, 10) || 30,
        maxQuantity: parseInt(serviceFormData.maxQuantity, 10) || 5,
        price: Number(serviceFormData.price) || 0,
      };

      if (editingService) {
        const updated = await updateService(editingService._id, payload);
        setServices((prev) => prev.map((s) => (s._id === editingService._id ? updated : s)));
        showToast(`Service "${updated.name}" updated.`);
      } else {
        const created = await createService(payload);
        setServices((prev) => [...prev, created]);
        showToast(`Service "${created.name}" added to catalog.`);
      }
      setServiceModalOpen(false);
    } catch (err) {
      showToast(`Service operation failed: ${err.message}`, 'error');
    } finally {
      setServiceSubmitting(false);
    }
  };

  const handleDeleteService = async (svc) => {
    if (!window.confirm(`Are you sure you want to deactivate service "${svc.name}"?`)) {
      return;
    }
    try {
      await deleteService(svc._id);
      setServices((prev) =>
        prev.map((s) => (s._id === svc._id ? { ...s, isActive: false } : s))
      );
      showToast(`Service "${svc.name}" deactivated.`);
    } catch (err) {
      showToast(`Service deactivation failed: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // ROOM INVENTORY MANAGEMENT ACTIONS
  // ----------------------------------------------------
  const handleOpenRoomModal = (room = null) => {
    setEditingRoom(room);
    if (room) {
      setRoomFormData({
        roomNumber: room.roomNumber,
        floor: room.floor,
        roomType: room.roomType,
        status: room.status,
        currentGuest: room.currentGuest?._id || room.currentGuest || '',
      });
    } else {
      setRoomFormData({
        roomNumber: '',
        floor: 1,
        roomType: ROOM_TYPE.STANDARD,
        status: ROOM_STATUS.AVAILABLE,
        currentGuest: '',
      });
    }
    setRoomModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      setRoomSubmitting(true);
      const payload = {
        ...roomFormData,
        floor: parseInt(roomFormData.floor, 10),
        currentGuest: roomFormData.currentGuest || null,
      };

      if (editingRoom) {
        const updated = await updateRoom(editingRoom._id, payload);
        setRooms((prev) => prev.map((r) => (r._id === editingRoom._id ? updated : r)));
        showToast(`Room ${updated.roomNumber} updated.`);
      } else {
        const created = await createRoom(payload);
        setRooms((prev) => [...prev, created]);
        showToast(`Room ${created.roomNumber} created.`);
      }
      setRoomModalOpen(false);
    } catch (err) {
      showToast(`Room operation failed: ${err.message}`, 'error');
    } finally {
      setRoomSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Are you sure you want to set Room ${room.roomNumber} out of service?`)) {
      return;
    }
    try {
      await deleteRoom(room._id);
      setRooms((prev) =>
        prev.map((r) =>
          r._id === room._id ? { ...r, isActive: false, status: ROOM_STATUS.OUT_OF_SERVICE } : r
        )
      );
      showToast(`Room ${room.roomNumber} marked Out of Service.`);
    } catch (err) {
      showToast(`Room action failed: ${err.message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // FILTERED LISTS
  // ----------------------------------------------------
  // 1. Filtered Requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const deptId = (r.department?._id || r.department)?.toString();
    const matchesDept = deptFilter === 'ALL' || deptId === deptFilter;
    const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
    const matchesSearch =
      !requestSearch ||
      r.requestNumber?.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.serviceTitle?.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.guest?.name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.room?.roomNumber?.toLowerCase().includes(requestSearch.toLowerCase());
    return matchesStatus && matchesDept && matchesPriority && matchesSearch;
  });

  // 2. Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'ALL' ||
      (userStatusFilter === 'ACTIVE' && u.isActive) ||
      (userStatusFilter === 'INACTIVE' && !u.isActive);
    const matchesSearch =
      !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone?.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  // 3. Filtered Departments
  const filteredDepartments = departments.filter((d) => {
    return (
      !deptSearch ||
      d.name?.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.code?.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.description?.toLowerCase().includes(deptSearch.toLowerCase())
    );
  });

  // 4. Filtered Services
  const filteredServices = services.filter((s) => {
    const matchesCat = serviceCategoryFilter === 'ALL' || s.category === serviceCategoryFilter;
    const matchesSearch =
      !serviceSearch ||
      s.name?.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.code?.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.description?.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // 5. Filtered Rooms
  const filteredRooms = rooms.filter((rm) => {
    const matchesFloor = roomFloorFilter === 'ALL' || String(rm.floor) === String(roomFloorFilter);
    const matchesSearch =
      !roomSearch ||
      rm.roomNumber?.toLowerCase().includes(roomSearch.toLowerCase()) ||
      rm.roomType?.toLowerCase().includes(roomSearch.toLowerCase()) ||
      rm.currentGuest?.name?.toLowerCase().includes(roomSearch.toLowerCase());
    return matchesFloor && matchesSearch;
  });

  // ----------------------------------------------------
  // TABLE COLUMNS CONFIGURATIONS
  // ----------------------------------------------------
  // 1. Request Table Columns
  const requestColumns = [
    {
      header: 'Ticket #',
      accessor: 'requestNumber',
      cellClassName: 'font-mono font-bold text-slate-900',
    },
    {
      header: 'Room & Guest',
      render: (ticket) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">
            Room {ticket.room?.roomNumber || 'N/A'}
          </span>
          <span className="text-xs text-slate-500">{ticket.guest?.name || 'Guest'}</span>
        </div>
      ),
    },
    {
      header: 'Service & Category',
      render: (ticket) => (
        <div>
          <span className="font-semibold text-slate-800 block">
            {ticket.serviceTitle || ticket.service?.name}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            {ticket.category}
          </span>
        </div>
      ),
    },
    {
      header: 'Priority',
      render: (ticket) => <PriorityBadge priority={ticket.priority} size="sm" />,
    },
    {
      header: 'Status',
      render: (ticket) => <StatusBadge status={ticket.status} size="sm" />,
    },
    {
      header: 'Assigned Staff',
      render: (ticket) =>
        ticket.assignedStaff?.name ? (
          <span className="font-semibold text-indigo-700 flex items-center text-xs">
            <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-500 flex-shrink-0" />
            {ticket.assignedStaff.name}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Unassigned</span>
        ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (ticket) => {
        const canDispatch = ![
          REQUEST_STATUS.COMPLETED,
          REQUEST_STATUS.CONFIRMED,
          REQUEST_STATUS.CANCELLED,
        ].includes(ticket.status);

        const canCancel = [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED].includes(ticket.status);

        return (
          <div className="flex items-center justify-end space-x-1.5">
            {canDispatch && (
              <Button
                variant="primary"
                size="xs"
                onClick={() => handleOpenAssignModal(ticket)}
              >
                {ticket.assignedStaff ? 'Reassign' : 'Assign'}
              </Button>
            )}

            {canDispatch && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleOpenPriorityModal(ticket)}
                title="Override Priority"
              >
                Priority
              </Button>
            )}

            {canCancel && (
              <Button
                variant="danger"
                size="xs"
                onClick={() => handleOpenCancelModal(ticket)}
                title="Cancel Request"
              >
                Cancel
              </Button>
            )}

            <Button
              variant="outline"
              size="xs"
              onClick={() => handleOpenHistory(ticket)}
              icon={History}
              title="View Audit Trail"
            >
              Audit
            </Button>
          </div>
        );
      },
    },
  ];

  // 2. User Table Columns
  const userColumns = [
    {
      header: 'User Name',
      render: (u) => (
        <div>
          <span className="font-bold text-slate-900 block">{u.name}</span>
          <span className="text-xs text-slate-500">{u.email}</span>
        </div>
      ),
    },
    {
      header: 'Role',
      render: (u) => (
        <Badge
          variant={
            u.role === USER_ROLES.ADMIN
              ? 'danger'
              : u.role === USER_ROLES.MANAGER
              ? 'warning'
              : u.role === USER_ROLES.STAFF
              ? 'primary'
              : 'neutral'
          }
          size="sm"
        >
          {u.role}
        </Badge>
      ),
    },
    {
      header: 'Department / Room',
      render: (u) => (
        <span className="text-xs text-slate-700">
          {u.department?.name ? (
            <span className="font-medium text-indigo-700">{u.department.name}</span>
          ) : u.room?.roomNumber ? (
            <span className="font-mono font-medium text-slate-800">
              Room {u.room.roomNumber}
            </span>
          ) : (
            <span className="text-slate-400 italic">None</span>
          )}
        </span>
      ),
    },
    {
      header: 'Operational Status',
      render: (u) => (
        <div className="flex items-center space-x-2">
          <Badge variant={u.isActive ? 'success' : 'neutral'} size="xs">
            {u.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
          {u.role === USER_ROLES.STAFF && (
            <Badge variant={u.isOnDuty ? 'primary' : 'warning'} size="xs">
              {u.isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenRoleModal(u)}
            title="Change User Role & Department"
          >
            Edit Role
          </Button>
          {u.role === USER_ROLES.STAFF && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleToggleStaffDuty(u)}
              title="Toggle On/Off Duty"
            >
              {u.isOnDuty ? 'Set Off Duty' : 'Set On Duty'}
            </Button>
          )}
          {u.role !== USER_ROLES.ADMIN && (
            <Button
              variant={u.isActive ? 'danger' : 'primary'}
              size="xs"
              onClick={() => handleToggleUserActive(u)}
            >
              {u.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // 3. Department Table Columns
  const deptColumns = [
    {
      header: 'Department',
      render: (d) => (
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            {d.code?.slice(0, 3)}
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{d.name}</span>
            <span className="text-xs text-slate-500 font-mono">CODE: {d.code}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (d) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-xs">
          {d.description || 'No description provided'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (d) => (
        <Badge variant={d.isActive ? 'success' : 'neutral'} size="sm">
          {d.isActive ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (d) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenDeptModal(d)}
            icon={Edit2}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="xs"
            onClick={() => handleDeleteDept(d)}
            icon={Trash2}
          >
            {d.isActive ? 'Deactivate' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  // 4. Service Table Columns
  const serviceColumns = [
    {
      header: 'Service Item',
      render: (s) => (
        <div>
          <span className="font-bold text-slate-900 block">{s.name}</span>
          <span className="text-xs text-slate-500 font-mono">{s.code}</span>
        </div>
      ),
    },
    {
      header: 'Category & Dept',
      render: (s) => (
        <div>
          <span className="text-xs font-semibold text-indigo-700 block">{s.category}</span>
          <span className="text-[11px] text-slate-500">{s.department?.name || 'Assigned Dept'}</span>
        </div>
      ),
    },
    {
      header: 'Default Priority',
      render: (s) => <PriorityBadge priority={s.defaultPriority} size="xs" />,
    },
    {
      header: 'Duration & Max Qty',
      render: (s) => (
        <div className="text-xs text-slate-600">
          <span>{s.estimatedDurationMinutes || 30} mins</span>
          {s.allowQuantity && <span className="block text-[11px] text-slate-400">Max: {s.maxQuantity || 5}</span>}
        </div>
      ),
    },
    {
      header: 'Price (₹)',
      render: (s) => (
        <span className="text-xs font-bold text-slate-800">
          {s.price && s.price > 0 ? `₹${s.price}` : 'Free'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (s) => (
        <Badge variant={s.isActive ? 'success' : 'neutral'} size="sm">
          {s.isActive ? 'ACTIVE' : 'INACTIVE'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenServiceModal(s)}
            icon={Edit2}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="xs"
            onClick={() => handleDeleteService(s)}
            icon={Trash2}
          >
            {s.isActive ? 'Deactivate' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  // 5. Room Table Columns
  const roomColumns = [
    {
      header: 'Room #',
      render: (r) => (
        <div className="flex items-center space-x-2">
          <Bed className="w-4 h-4 text-indigo-500" />
          <span className="font-mono font-bold text-slate-900">Room {r.roomNumber}</span>
        </div>
      ),
    },
    {
      header: 'Floor & Type',
      render: (r) => (
        <div>
          <span className="text-xs font-bold text-slate-800 block">Floor {r.floor}</span>
          <span className="text-[11px] text-slate-500">{r.roomType}</span>
        </div>
      ),
    },
    {
      header: 'Occupancy Status',
      render: (r) => {
        const badgeVariant =
          r.status === ROOM_STATUS.AVAILABLE
            ? 'success'
            : r.status === ROOM_STATUS.OCCUPIED
            ? 'primary'
            : r.status === ROOM_STATUS.MAINTENANCE
            ? 'warning'
            : 'danger';

        return (
          <div>
            <Badge variant={badgeVariant} size="xs">
              {r.status}
            </Badge>
            {r.currentGuest && (
              <span className="block text-[11px] text-slate-600 mt-0.5">
                Guest: {r.currentGuest.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Inventory State',
      render: (r) => (
        <Badge variant={r.isActive ? 'success' : 'neutral'} size="xs">
          {r.isActive ? 'IN SERVICE' : 'OUT OF SERVICE'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cellClassName: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenRoomModal(r)}
            icon={Edit2}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="xs"
            onClick={() => handleDeleteRoom(r)}
            icon={Trash2}
          >
            {r.isActive ? 'Disable' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  if (loading && requests.length === 0) {
    return (
      <AppLayout portalName="Admin Operations Center">
        <div className="py-16">
          <LoadingSpinner size="lg" message="Connecting to Hotel Service Hub operations backend..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      portalName="Admin Operations Center"
      headerActions={
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllData}
            icon={RefreshCw}
            aria-label="Refresh Data"
          >
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>
        </div>
      }
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Primary KPI Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-white shadow-sm border-slate-200">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
            Total Requests
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{totalTickets}</span>
        </Card>

        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <span className="text-[11px] text-amber-800 font-bold uppercase tracking-wider block">
            Pending Triage
          </span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{pendingCount}</span>
        </Card>

        <Card className="p-4 bg-blue-50/50 border-blue-200">
          <span className="text-[11px] text-blue-800 font-bold uppercase tracking-wider block">
            Assigned Queue
          </span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">{assignedCount}</span>
        </Card>

        <Card className="p-4 bg-indigo-50/50 border-indigo-200">
          <span className="text-[11px] text-indigo-800 font-bold uppercase tracking-wider block">
            In Progress
          </span>
          <span className="text-2xl font-black text-indigo-900 mt-1 block">{inProgressCount}</span>
        </Card>

        <Card className="p-4 bg-rose-50/50 border-rose-200">
          <span className="text-[11px] text-rose-800 font-bold uppercase tracking-wider block">
            Urgent Escalations
          </span>
          <span className="text-2xl font-black text-rose-900 mt-1 block">{urgentCount}</span>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider block">
            Resolved
          </span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{completedCount}</span>
        </Card>
      </div>

      {/* Main Administrative Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-1 sm:space-x-4 pt-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center space-x-2 py-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Service Requests ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 py-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Staff Directory ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center space-x-2 py-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center space-x-2 py-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'services'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Service Catalog ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center space-x-2 py-3 px-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rooms'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Room Inventory ({rooms.length})</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: SERVICE REQUESTS MANAGEMENT                  */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <FilterBar
            activeCount={
              (statusFilter !== 'ALL' ? 1 : 0) +
              (deptFilter !== 'ALL' ? 1 : 0) +
              (priorityFilter !== 'ALL' ? 1 : 0)
            }
            onReset={() => {
              setStatusFilter('ALL');
              setDeptFilter('ALL');
              setPriorityFilter('ALL');
              setRequestSearch('');
            }}
          >
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {Object.values(REQUEST_STATUS).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              {Object.values(REQUEST_PRIORITY).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <SearchInput
                placeholder="Search ticket, room, guest..."
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                onClear={() => setRequestSearch('')}
              />
            </div>
          </FilterBar>

          <ResponsiveTable
            columns={requestColumns}
            data={filteredRequests}
            keyExtractor={(item) => item._id || item.id}
            emptyTitle="No service requests found"
            emptyDescription="No tickets match the selected status, department, or search filters."
            striped
          />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: USER & STAFF MANAGEMENT                      */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <FilterBar
              activeCount={
                (userRoleFilter !== 'ALL' ? 1 : 0) + (userStatusFilter !== 'ALL' ? 1 : 0)
              }
              onReset={() => {
                setUserRoleFilter('ALL');
                setUserStatusFilter('ALL');
                setUserSearch('');
              }}
            >
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value={USER_ROLES.STAFF}>Staff</option>
                <option value={USER_ROLES.MANAGER}>Manager</option>
                <option value={USER_ROLES.GUEST}>Guest</option>
                <option value={USER_ROLES.ADMIN}>Admin</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>

              <div className="w-full sm:w-64">
                <SearchInput
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onClear={() => setUserSearch('')}
                />
              </div>
            </FilterBar>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateUserModal}
              icon={UserPlus}
            >
              Add User Account
            </Button>
          </div>

          <ResponsiveTable
            columns={userColumns}
            data={filteredUsers}
            keyExtractor={(u) => u._id}
            emptyTitle="No users found"
            emptyDescription="No registered users match your search and role criteria."
            striped
          />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: DEPARTMENT MANAGEMENT                        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                onClear={() => setDeptSearch('')}
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenDeptModal(null)}
              icon={Plus}
            >
              Add Department
            </Button>
          </div>

          <ResponsiveTable
            columns={deptColumns}
            data={filteredDepartments}
            keyExtractor={(d) => d._id}
            emptyTitle="No departments found"
            emptyDescription="Create a department to categorize hotel services."
            striped
          />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: SERVICE CATALOG MANAGEMENT                   */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <FilterBar
              activeCount={serviceCategoryFilter !== 'ALL' ? 1 : 0}
              onReset={() => {
                setServiceCategoryFilter('ALL');
                setServiceSearch('');
              }}
            >
              <select
                value={serviceCategoryFilter}
                onChange={(e) => setServiceCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {Object.values(SERVICE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="w-full sm:w-64">
                <SearchInput
                  placeholder="Search catalog items..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  onClear={() => setServiceSearch('')}
                />
              </div>
            </FilterBar>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenServiceModal(null)}
              icon={Plus}
            >
              Add Catalog Service
            </Button>
          </div>

          <ResponsiveTable
            columns={serviceColumns}
            data={filteredServices}
            keyExtractor={(s) => s._id}
            emptyTitle="No catalog services found"
            emptyDescription="Create hotel guest services to populate the guest portal catalog."
            striped
          />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: ROOM INVENTORY MANAGEMENT                    */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <FilterBar
              activeCount={roomFloorFilter !== 'ALL' ? 1 : 0}
              onReset={() => {
                setRoomFloorFilter('ALL');
                setRoomSearch('');
              }}
            >
              <select
                value={roomFloorFilter}
                onChange={(e) => setRoomFloorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Floors</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => (
                  <option key={f} value={f}>
                    Floor {f}
                  </option>
                ))}
              </select>

              <div className="w-full sm:w-64">
                <SearchInput
                  placeholder="Search room number, type, guest..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  onClear={() => setRoomSearch('')}
                />
              </div>
            </FilterBar>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenRoomModal(null)}
              icon={Plus}
            >
              Add Room
            </Button>
          </div>

          <ResponsiveTable
            columns={roomColumns}
            data={filteredRooms}
            keyExtractor={(r) => r._id}
            emptyTitle="No rooms found"
            emptyDescription="Configure rooms in your hotel inventory."
            striped
          />
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS                                               */}
      {/* ==================================================== */}

      {/* 1. Manual Staff Assignment Modal */}
      <Modal
        isOpen={assignModalOpen && Boolean(selectedTicket)}
        onClose={() => setAssignModalOpen(false)}
        title={`Dispatch Staff: #${selectedTicket?.requestNumber}`}
        description={`Assign or reassign an eligible on-duty staff member in ${selectedTicket?.category}`}
        size="md"
      >
        {selectedTicket && (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <FormField label="Assignee Staff Member" required>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Choose eligible staff member...</option>
                {staffList
                  .filter((s) => {
                    const deptId = (
                      selectedTicket.department?._id || selectedTicket.department
                    )?.toString();
                    const sDept = (s.department?._id || s.department)?.toString();
                    return sDept === deptId;
                  })
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.isOnDuty ? 'On Duty' : 'Off Duty'})
                    </option>
                  ))}
              </select>
            </FormField>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalOpen(false)}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={assigning}
                loadingText="Dispatching..."
                icon={Send}
              >
                Confirm Assignment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 2. Priority Override Modal */}
      <Modal
        isOpen={priorityModalOpen && Boolean(selectedTicket)}
        onClose={() => setPriorityModalOpen(false)}
        title={`Priority Override: #${selectedTicket?.requestNumber}`}
        description="Escalate or adjust the operational priority of this ticket"
        size="md"
      >
        {selectedTicket && (
          <form onSubmit={handlePrioritySubmit} className="space-y-4">
            <FormField label="Operational Priority" required>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {Object.values(REQUEST_PRIORITY).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Escalation / Override Reason" required>
              <Input
                placeholder="e.g. VIP guest arrival, active water leak escalation"
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
                required
              />
            </FormField>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPriorityModalOpen(false)}
                disabled={priorityUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={priorityUpdating}
                loadingText="Updating..."
                icon={ArrowUpRight}
              >
                Apply Priority
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 3. Cancel Ticket Modal */}
      <Modal
        isOpen={cancelModalOpen && Boolean(selectedTicket)}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Ticket: #${selectedTicket?.requestNumber}`}
        description="Terminates this service request ticket with an audit reason"
        size="md"
      >
        {selectedTicket && (
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <strong>Caution:</strong> Cancelling will notify the guest and staff member. Only
              tickets in PENDING or ASSIGNED state may be cancelled.
            </div>

            <FormField label="Cancellation Reason" required>
              <Textarea
                placeholder="Provide a clear operational reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                required
              />
            </FormField>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={cancelling}
                loadingText="Cancelling..."
                icon={Ban}
              >
                Confirm Cancellation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 4. Audit History Timeline Modal */}
      <Modal
        isOpen={historyModalOpen && Boolean(selectedTicket)}
        onClose={() => setHistoryModalOpen(false)}
        title={`Audit Trail: #${selectedTicket?.requestNumber}`}
        description="Immutable transition logs and timestamps"
        size="lg"
      >
        {historyLoading ? (
          <LoadingSpinner size="md" message="Loading audit history logs..." />
        ) : historyList.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No audit entries"
            description="No transition logs have been recorded for this ticket yet."
          />
        ) : (
          <div className="space-y-4">
            <div className="flow-root">
              <ul className="-mb-8">
                {historyList.map((entry, idx) => {
                  const isLast = idx === historyList.length - 1;
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
                                  By: {entry.performedBy.name || 'System Operator'} (
                                  {entry.performedBy.role || 'Staff'})
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

      {/* 5. Create User Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Create Authorized User Account"
        description="Register a new Staff, Manager, or Guest user in Hotel Service Hub"
        size="md"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-3">
          <FormField label="Full Name" required>
            <Input
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              placeholder="e.g. Elena Rostova"
              required
            />
          </FormField>

          <FormField label="Email Address" required>
            <Input
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              placeholder="elena@hotelhub.com"
              required
            />
          </FormField>

          <FormField label="Initial Password" required>
            <Input
              type="password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              placeholder="Min 6 characters"
              required
            />
          </FormField>

          <FormField label="Phone Number">
            <Input
              value={userFormData.phone}
              onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </FormField>

          <FormField label="User Role" required>
            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value={USER_ROLES.STAFF}>STAFF (Operational)</option>
              <option value={USER_ROLES.MANAGER}>MANAGER (Reporting)</option>
              <option value={USER_ROLES.GUEST}>GUEST (In-Room)</option>
            </select>
          </FormField>

          {userFormData.role === USER_ROLES.STAFF && (
            <FormField label="Assigned Department" required>
              <select
                value={userFormData.department}
                onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {userFormData.role === USER_ROLES.GUEST && (
            <FormField label="Assigned Room">
              <select
                value={userFormData.room}
                onChange={(e) => setUserFormData({ ...userFormData, room: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select room (optional)...</option>
                {rooms.map((r) => (
                  <option key={r._id} value={r._id}>
                    Room {r.roomNumber} (Floor {r.floor})
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserModalOpen(false)}
              disabled={userSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={userSubmitting}
              loadingText="Creating..."
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5b. User Role & Department Management Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Change Role & Department: ${editingUserForRole?.name || 'User'}`}
      >
        <form onSubmit={handleSaveUserRole} className="space-y-4 pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <p className="font-semibold text-slate-800">{editingUserForRole?.name} ({editingUserForRole?.email})</p>
            <p className="mt-1">
              Google OAuth automatically signs in guests by default for security. Use this control to assign staff roles or departments to any Google-authenticated user.
            </p>
          </div>

          <FormField label="Assigned Role" required>
            <select
              value={roleTargetRole}
              onChange={(e) => setRoleTargetRole(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              required
            >
              <option value={USER_ROLES.STAFF}>STAFF (Operational / Worker)</option>
              <option value={USER_ROLES.MANAGER}>MANAGER (Reporting / Operations)</option>
              <option value={USER_ROLES.GUEST}>GUEST (Hotel Guest)</option>
              <option value={USER_ROLES.ADMIN}>ADMIN (Full Control)</option>
            </select>
          </FormField>

          {roleTargetRole === USER_ROLES.STAFF && (
            <FormField label="Staff Department" required>
              <select
                value={roleTargetDept}
                onChange={(e) => setRoleTargetDept(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleModalOpen(false)}
              disabled={roleSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={roleSubmitting}
              loadingText="Updating..."
            >
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Department Create / Edit Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Create New Department'}
        description="Manage organizational divisions responsible for service fulfillment"
        size="md"
      >
        <form onSubmit={handleDeptSubmit} className="space-y-3">
          <FormField label="Department Name" required>
            <Input
              value={deptFormData.name}
              onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
              placeholder="e.g. Concierge Services"
              required
            />
          </FormField>

          <FormField label="Department Code" required>
            <Input
              value={deptFormData.code}
              onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CONCIERGE"
              required
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={deptFormData.description}
              onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
              placeholder="Brief description of department scope..."
              rows={3}
            />
          </FormField>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeptModalOpen(false)}
              disabled={deptSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={deptSubmitting}
              loadingText="Saving..."
            >
              {editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Service Catalog Create / Edit Modal */}
      <Modal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingService ? `Edit Service: ${editingService.name}` : 'Add Catalog Service'}
        description="Configure offerings available in guest and staff request catalog"
        size="lg"
      >
        <form onSubmit={handleServiceSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Service Name" required>
              <Input
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                placeholder="e.g. Extra Down Pillows"
                required
              />
            </FormField>

            <FormField label="Service Code" required>
              <Input
                value={serviceFormData.code}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. HK-PILLOW"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Category" required>
              <select
                value={serviceFormData.category}
                onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {Object.values(SERVICE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Assigned Department" required>
              <select
                value={serviceFormData.department}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, department: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Default Priority">
              <select
                value={serviceFormData.defaultPriority}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, defaultPriority: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.values(REQUEST_PRIORITY).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Est. Duration (Mins)">
              <Input
                type="number"
                min="1"
                value={serviceFormData.estimatedDurationMinutes}
                onChange={(e) =>
                  setServiceFormData({
                    ...serviceFormData,
                    estimatedDurationMinutes: e.target.value,
                  })
                }
              />
            </FormField>

            <FormField label="Max Quantity Allowed">
              <Input
                type="number"
                min="1"
                value={serviceFormData.maxQuantity}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, maxQuantity: e.target.value })
                }
              />
            </FormField>

            <FormField label="Price (₹ INR)">
              <Input
                type="number"
                min="0"
                value={serviceFormData.price}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, price: e.target.value })
                }
                placeholder="0 for complimentary"
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Textarea
              value={serviceFormData.description}
              onChange={(e) =>
                setServiceFormData({ ...serviceFormData, description: e.target.value })
              }
              placeholder="Detailed description of the service..."
              rows={2}
            />
          </FormField>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setServiceModalOpen(false)}
              disabled={serviceSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={serviceSubmitting}
              loadingText="Saving..."
            >
              {editingService ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. Room Create / Edit Modal */}
      <Modal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.roomNumber}` : 'Add Room to Inventory'}
        description="Configure room details and occupancy status"
        size="md"
      >
        <form onSubmit={handleRoomSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Room Number" required>
              <Input
                value={roomFormData.roomNumber}
                onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
                placeholder="e.g. 302"
                required
              />
            </FormField>

            <FormField label="Floor" required>
              <Input
                type="number"
                min="1"
                value={roomFormData.floor}
                onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Room Type" required>
              <select
                value={roomFormData.roomType}
                onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {Object.values(ROOM_TYPE).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Occupancy Status" required>
              <select
                value={roomFormData.status}
                onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {Object.values(ROOM_STATUS).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Assigned Guest (Optional)">
            <select
              value={roomFormData.currentGuest}
              onChange={(e) => setRoomFormData({ ...roomFormData, currentGuest: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No current guest (Vacant)</option>
              {usersList
                .filter((u) => u.role === USER_ROLES.GUEST)
                .map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} ({g.email})
                  </option>
                ))}
            </select>
          </FormField>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoomModalOpen(false)}
              disabled={roomSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={roomSubmitting}
              loadingText="Saving..."
            >
              {editingRoom ? 'Update Room' : 'Add Room'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
