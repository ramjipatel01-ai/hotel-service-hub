import User from '../models/User.js';
import Request from '../models/Request.js';
import { USER_ROLES, REQUEST_STATUS } from '../config/constants.js';

/**
 * Finds eligible on-duty staff members for a specific department and selects
 * the candidate with the lowest active workload using deterministic tie-breaking.
 *
 * Active workload = count of requests with status IN ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS']
 *
 * @param {string|mongoose.Types.ObjectId} departmentId - Department to search within
 * @returns {Promise<Object|null>} Selected User document, or null if no eligible staff is available
 */
export async function allocateStaffToRequest(departmentId) {
  if (!departmentId) {
    return null;
  }

  // 1. Fetch all active, on-duty staff members belonging to the specified department
  const eligibleStaff = await User.find({
    role: USER_ROLES.STAFF,
    department: departmentId,
    isActive: true,
    isOnDuty: true,
  }).lean();

  if (!eligibleStaff || eligibleStaff.length === 0) {
    return null;
  }

  // If only one staff member is eligible, return immediately
  if (eligibleStaff.length === 1) {
    return eligibleStaff[0];
  }

  const staffIds = eligibleStaff.map((s) => s._id);

  // 2. Aggregate active workloads for all eligible staff members
  const activeWorkloads = await Request.aggregate([
    {
      $match: {
        assignedStaff: { $in: staffIds },
        status: {
          $in: [
            REQUEST_STATUS.ASSIGNED,
            REQUEST_STATUS.ACCEPTED,
            REQUEST_STATUS.IN_PROGRESS,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$assignedStaff',
        activeCount: { $sum: 1 },
        lastAssignedAt: { $max: '$assignedAt' },
      },
    },
  ]);

  // Build a lookup map of workload metrics by staff ID string
  const workloadMap = new Map();
  for (const item of activeWorkloads) {
    workloadMap.set(String(item._id), {
      count: item.activeCount,
      lastAssignedAt: item.lastAssignedAt ? new Date(item.lastAssignedAt).getTime() : 0,
    });
  }

  // 3. Score each candidate and sort:
  // - Primary: lowest active workload count
  // - Secondary: oldest last-assignment time (or 0 if never assigned)
  // - Tertiary: deterministic string comparison of _id
  const evaluatedStaff = eligibleStaff.map((staff) => {
    const metrics = workloadMap.get(String(staff._id)) || { count: 0, lastAssignedAt: 0 };
    return {
      staff,
      activeCount: metrics.count,
      lastAssignedAt: metrics.lastAssignedAt,
    };
  });

  evaluatedStaff.sort((a, b) => {
    // Lowest active workload first
    if (a.activeCount !== b.activeCount) {
      return a.activeCount - b.activeCount;
    }
    // Oldest lastAssignedAt first (0 means never assigned, so prioritized)
    if (a.lastAssignedAt !== b.lastAssignedAt) {
      return a.lastAssignedAt - b.lastAssignedAt;
    }
    // Deterministic tie-breaking on ID
    return String(a.staff._id).localeCompare(String(b.staff._id));
  });

  return evaluatedStaff[0].staff;
}

/**
 * Validates whether a candidate staff member can be assigned to a department
 *
 * @param {string|mongoose.Types.ObjectId} staffId
 * @param {string|mongoose.Types.ObjectId} departmentId
 * @returns {Promise<{ valid: boolean, staff?: Object, reason?: string }>}
 */
export async function validateStaffForAssignment(staffId, departmentId) {
  const staff = await User.findById(staffId);
  if (!staff) {
    return { valid: false, reason: 'Staff member not found.' };
  }
  if (staff.role !== USER_ROLES.STAFF) {
    return { valid: false, reason: `User has role "${staff.role}", only "${USER_ROLES.STAFF}" can be assigned.` };
  }
  if (!staff.isActive) {
    return { valid: false, reason: 'Staff member account is deactivated.' };
  }
  if (String(staff.department) !== String(departmentId)) {
    return { valid: false, reason: 'Staff member does not belong to the request department.' };
  }

  return { valid: true, staff };
}
