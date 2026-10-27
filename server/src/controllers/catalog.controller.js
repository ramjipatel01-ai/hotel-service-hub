import Department from '../models/Department.js';
import Service from '../models/Service.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import {
  USER_ROLES,
  SERVICE_CATEGORIES,
  REQUEST_PRIORITY,
  ROOM_TYPE,
  ROOM_STATUS,
} from '../config/constants.js';
import { isValidObjectId } from '../utils/dbUtils.js';

// ==========================================
// 1. DEPARTMENT CONTROLLERS
// ==========================================

/**
 * Returns hotel departments
 * Route: GET /api/departments
 */
export async function getDepartments(req, res, next) {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };

    const departments = await Department.find(filter)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: { departments },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin creates a new department
 * Route: POST /api/departments
 */
export async function createDepartment(req, res, next) {
  try {
    const { name, code, description, icon } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department code is required.',
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check unique code or name
    const existing = await Department.findOne({
      $or: [{ code: normalizedCode }, { name: name.trim() }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name or code already exists.',
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: normalizedCode,
      description: description ? description.trim() : '',
      icon: icon ? icon.trim() : 'Building',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: { department },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A department with this name or code already exists.',
      });
    }
    next(error);
  }
}

/**
 * Admin updates department details
 * Route: PATCH /api/departments/:id
 */
export async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format.',
      });
    }

    const { name, code, description, icon, isActive } = req.body;
    const updates = {};

    if (name && typeof name === 'string') updates.name = name.trim();
    if (code && typeof code === 'string') updates.code = code.trim().toUpperCase();
    if (description !== undefined) updates.description = String(description).trim();
    if (icon !== undefined) updates.icon = String(icon).trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (updates.code || updates.name) {
      const conflict = await Department.findOne({
        _id: { $ne: id },
        $or: [
          ...(updates.code ? [{ code: updates.code }] : []),
          ...(updates.name ? [{ name: updates.name }] : []),
        ],
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another department already uses this name or code.',
        });
      }
    }

    const department = await Department.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully.',
      data: { department },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate department name or code.',
      });
    }
    next(error);
  }
}

/**
 * Admin deactivates/deletes department safely
 * Route: DELETE /api/departments/:id
 */
export async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format.',
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    // Check if referenced by requests or services
    const [requestCount, serviceCount] = await Promise.all([
      Request.countDocuments({ department: id }),
      Service.countDocuments({ department: id }),
    ]);

    if (requestCount > 0 || serviceCount > 0) {
      // Soft-deactivate to protect historical references
      department.isActive = false;
      await department.save();

      return res.status(200).json({
        success: true,
        message: `Department deactivated safely to preserve ${requestCount} historical request(s) and ${serviceCount} service(s).`,
        data: { department, softDeleted: true },
      });
    }

    await Department.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully.',
      data: { departmentId: id, softDeleted: false },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. SERVICE CONTROLLERS
// ==========================================

/**
 * Returns hotel services
 * Route: GET /api/services
 */
export async function getServices(req, res, next) {
  try {
    const { category, department, includeInactive, search } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };

    if (category && Object.values(SERVICE_CATEGORIES).includes(category)) {
      filter.category = category;
    }

    if (department && isValidObjectId(department)) {
      filter.department = department;
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const services = await Service.find(filter)
      .populate('department', 'name code icon')
      .sort({ category: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Services retrieved successfully',
      data: { services },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin creates a new service in catalog
 * Route: POST /api/services
 */
export async function createService(req, res, next) {
  try {
    const {
      name,
      code,
      category,
      department,
      description,
      icon,
      defaultPriority,
      estimatedDurationMinutes,
      allowQuantity,
      maxQuantity,
      price,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required.',
      });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service code is required.',
      });
    }

    if (!category || !Object.values(SERVICE_CATEGORIES).includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service category. Must be one of: ${Object.values(SERVICE_CATEGORIES).join(', ')}`,
      });
    }

    if (!department || !isValidObjectId(department)) {
      return res.status(400).json({
        success: false,
        message: 'A valid department reference is required.',
      });
    }

    // Verify department exists
    const deptExists = await Department.findById(department);
    if (!deptExists) {
      return res.status(400).json({
        success: false,
        message: 'Specified department does not exist.',
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check duplicate service code
    const existingCode = await Service.findOne({ code: normalizedCode });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: `Service with code "${normalizedCode}" already exists.`,
      });
    }

    let resolvedPriority = REQUEST_PRIORITY.NORMAL;
    if (defaultPriority && Object.values(REQUEST_PRIORITY).includes(defaultPriority)) {
      resolvedPriority = defaultPriority;
    }

    const duration = Math.max(1, parseInt(estimatedDurationMinutes, 10) || 30);
    const maxQty = Math.max(1, parseInt(maxQuantity, 10) || 5);
    const servicePrice = Math.max(0, parseFloat(price) || 0);

    const service = await Service.create({
      name: name.trim(),
      code: normalizedCode,
      category,
      department,
      description: description ? description.trim() : '',
      icon: icon ? icon.trim() : 'Sparkles',
      defaultPriority: resolvedPriority,
      estimatedDurationMinutes: duration,
      allowQuantity: Boolean(allowQuantity),
      maxQuantity: maxQty,
      price: servicePrice,
      isActive: true,
    });

    const populated = await Service.findById(service._id).populate('department', 'name code icon');

    return res.status(201).json({
      success: true,
      message: 'Service created successfully in catalog.',
      data: { service: populated },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Service code already exists.',
      });
    }
    next(error);
  }
}

/**
 * Admin updates a catalog service
 * Route: PATCH /api/services/:id
 */
export async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID format.',
      });
    }

    const {
      name,
      code,
      category,
      department,
      description,
      icon,
      defaultPriority,
      estimatedDurationMinutes,
      allowQuantity,
      maxQuantity,
      price,
      isActive,
    } = req.body;

    const updates = {};
    if (name && typeof name === 'string') updates.name = name.trim();
    if (code && typeof code === 'string') updates.code = code.trim().toUpperCase();
    if (category && Object.values(SERVICE_CATEGORIES).includes(category)) updates.category = category;
    if (description !== undefined) updates.description = String(description).trim();
    if (icon !== undefined) updates.icon = String(icon).trim();
    if (defaultPriority && Object.values(REQUEST_PRIORITY).includes(defaultPriority)) {
      updates.defaultPriority = defaultPriority;
    }
    if (estimatedDurationMinutes !== undefined) {
      updates.estimatedDurationMinutes = Math.max(1, parseInt(estimatedDurationMinutes, 10) || 30);
    }
    if (allowQuantity !== undefined) updates.allowQuantity = Boolean(allowQuantity);
    if (maxQuantity !== undefined) updates.maxQuantity = Math.max(1, parseInt(maxQuantity, 10) || 5);
    if (price !== undefined) updates.price = Math.max(0, parseFloat(price) || 0);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (department) {
      if (!isValidObjectId(department)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID format.',
        });
      }
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({
          success: false,
          message: 'Specified department does not exist.',
        });
      }
      updates.department = department;
    }

    if (updates.code) {
      const conflict = await Service.findOne({ _id: { $ne: id }, code: updates.code });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another service already uses this code.',
        });
      }
    }

    const service = await Service.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('department', 'name code icon');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: { service },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Service code already exists.',
      });
    }
    next(error);
  }
}

/**
 * Admin deactivates/deletes a catalog service safely
 * Route: DELETE /api/services/:id
 */
export async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID format.',
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    // Always soft-deactivate services to preserve historical requests
    service.isActive = false;
    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Service deactivated successfully to preserve request history.',
      data: { service, softDeleted: true },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. ROOM CONTROLLERS
// ==========================================

/**
 * Returns hotel rooms
 * Route: GET /api/rooms
 */
export async function getRooms(req, res, next) {
  try {
    const { floor, roomType, status, includeInactive, search } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };

    if (floor) {
      filter.floor = parseInt(floor, 10);
    }

    if (roomType && Object.values(ROOM_TYPE).includes(roomType)) {
      filter.roomType = roomType;
    }

    if (status && Object.values(ROOM_STATUS).includes(status)) {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.roomNumber = { $regex: search.trim(), $options: 'i' };
    }

    const rooms = await Room.find(filter)
      .populate('currentGuest', 'name email phone')
      .sort({ floor: 1, roomNumber: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Rooms retrieved successfully',
      data: { rooms },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin creates a new room
 * Route: POST /api/rooms
 */
export async function createRoom(req, res, next) {
  try {
    const { roomNumber, floor, roomType, status, currentGuest } = req.body;

    if (!roomNumber || typeof roomNumber !== 'string' || !roomNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Room number is required.',
      });
    }

    const floorNum = parseInt(floor, 10);
    if (isNaN(floorNum) || floorNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Floor must be a valid positive integer.',
      });
    }

    const normalizedRoom = roomNumber.trim();

    // Check duplicate room number
    const existing = await Room.findOne({ roomNumber: normalizedRoom });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Room number "${normalizedRoom}" already exists.`,
      });
    }

    let resolvedType = ROOM_TYPE.STANDARD;
    if (roomType && Object.values(ROOM_TYPE).includes(roomType)) {
      resolvedType = roomType;
    }

    let resolvedStatus = ROOM_STATUS.AVAILABLE;
    if (status && Object.values(ROOM_STATUS).includes(status)) {
      resolvedStatus = status;
    }

    let guestRef = null;
    if (currentGuest) {
      if (!isValidObjectId(currentGuest)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid guest ID format.',
        });
      }
      const guest = await User.findById(currentGuest);
      if (!guest || guest.role !== USER_ROLES.GUEST) {
        return res.status(400).json({
          success: false,
          message: 'Current guest must reference a valid guest user account.',
        });
      }
      guestRef = guest._id;
      resolvedStatus = ROOM_STATUS.OCCUPIED;
    }

    const room = await Room.create({
      roomNumber: normalizedRoom,
      floor: floorNum,
      roomType: resolvedType,
      status: resolvedStatus,
      currentGuest: guestRef,
      isActive: true,
    });

    const populated = await Room.findById(room._id).populate('currentGuest', 'name email phone');

    return res.status(201).json({
      success: true,
      message: 'Room created successfully.',
      data: { room: populated },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Room number already exists.',
      });
    }
    next(error);
  }
}

/**
 * Admin updates a room
 * Route: PATCH /api/rooms/:id
 */
export async function updateRoom(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID format.',
      });
    }

    const { roomNumber, floor, roomType, status, currentGuest, isActive } = req.body;
    const updates = {};

    if (roomNumber && typeof roomNumber === 'string') updates.roomNumber = roomNumber.trim();
    if (floor !== undefined) {
      const floorNum = parseInt(floor, 10);
      if (isNaN(floorNum) || floorNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Floor must be a valid positive integer.',
        });
      }
      updates.floor = floorNum;
    }
    if (roomType && Object.values(ROOM_TYPE).includes(roomType)) updates.roomType = roomType;
    if (status && Object.values(ROOM_STATUS).includes(status)) updates.status = status;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (currentGuest !== undefined) {
      if (currentGuest === null || currentGuest === '') {
        updates.currentGuest = null;
        if (!status) updates.status = ROOM_STATUS.AVAILABLE;
      } else {
        if (!isValidObjectId(currentGuest)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid guest ID format.',
          });
        }
        const guest = await User.findById(currentGuest);
        if (!guest || guest.role !== USER_ROLES.GUEST) {
          return res.status(400).json({
            success: false,
            message: 'Current guest must be a valid GUEST user account.',
          });
        }
        updates.currentGuest = guest._id;
        if (!status) updates.status = ROOM_STATUS.OCCUPIED;
      }
    }

    if (updates.roomNumber) {
      const conflict = await Room.findOne({ _id: { $ne: id }, roomNumber: updates.roomNumber });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Another room already uses this room number.',
        });
      }
    }

    const room = await Room.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('currentGuest', 'name email phone');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Room updated successfully.',
      data: { room },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Room number already exists.',
      });
    }
    next(error);
  }
}

/**
 * Admin deactivates/deletes a room safely
 * Route: DELETE /api/rooms/:id
 */
export async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID format.',
      });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    // Soft-deactivate to protect historical request linkages
    room.isActive = false;
    room.status = ROOM_STATUS.OUT_OF_SERVICE;
    await room.save();

    return res.status(200).json({
      success: true,
      message: 'Room deactivated successfully to preserve historical bookings and request records.',
      data: { room, softDeleted: true },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. STAFF DIRECTORY
// ==========================================

/**
 * Returns staff members, optionally filtered by department and duty status
 * Route: GET /api/staff
 */
export async function getStaffDirectory(req, res, next) {
  try {
    const { department, onDutyOnly } = req.query;
    const filter = { role: USER_ROLES.STAFF, isActive: true };

    if (department && isValidObjectId(department)) {
      filter.department = department;
    }

    if (onDutyOnly === 'true') {
      filter.isOnDuty = true;
    }

    const staff = await User.find(filter)
      .populate('department', 'name code')
      .select('-password')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Staff directory retrieved successfully',
      data: { staff },
    });
  } catch (error) {
    next(error);
  }
}
