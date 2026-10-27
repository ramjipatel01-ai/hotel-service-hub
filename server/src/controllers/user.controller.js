import User from '../models/User.js';
import Department from '../models/Department.js';
import { USER_ROLES } from '../config/constants.js';
import { hashPassword, sanitizeUser, generateToken } from '../services/auth.service.js';
import { assignUniqueRoomToGuest } from '../services/roomAssignment.service.js';

/**
 * @route   GET /api/users/me
 * @desc    Get authenticated user's profile details
 * @access  Protected
 */
export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (user && user.role === USER_ROLES.GUEST && !user.room) {
      await assignUniqueRoomToGuest(user);
    }

    await user.populate('department', 'name code icon');
    await user.populate('room', 'roomNumber floor roomType status');

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved',
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error('[GetProfile Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
    });
  }
}

/**
 * @route   PATCH /api/users/me
 * @desc    Update self profile with allowed fields (name, phone, avatar)
 * @access  Protected
 */
export async function updateProfile(req, res) {
  try {
    const { name, phone, avatar } = req.body;
    const updates = {};

    if (name && typeof name === 'string') updates.name = name.trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (avatar !== undefined) updates.avatar = String(avatar).trim();
    if (req.body.isOnDuty !== undefined && typeof req.body.isOnDuty === 'boolean') {
      updates.isOnDuty = req.body.isOnDuty;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code icon')
      .populate('room', 'roomNumber floor roomType status');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: sanitizeUser(updatedUser) },
    });
  } catch (error) {
    console.error('[UpdateProfile Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
    });
  }
}

/**
 * @route   PATCH /api/users/me/on-duty
 * @desc    Toggle authenticated staff member's own on-duty operational availability
 * @access  Protected (STAFF only, or ADMIN)
 */
export async function updateMyDutyStatus(req, res) {
  try {
    if (req.user.role !== USER_ROLES.STAFF && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only staff and administrators can modify operational on-duty status.',
      });
    }

    const { isOnDuty } = req.body;
    if (typeof isOnDuty !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "isOnDuty" is required and must be a boolean (true or false).',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { isOnDuty } },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code icon')
      .populate('room', 'roomNumber floor roomType status');

    return res.status(200).json({
      success: true,
      message: `Operational status updated to ${isOnDuty ? 'ON DUTY' : 'OFF DUTY'}.`,
      data: { user: sanitizeUser(updatedUser) },
    });
  } catch (error) {
    console.error('[UpdateDutyStatus Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update duty status.',
    });
  }
}

/**
 * @route   POST /api/users
 * @desc    Admin creation of Staff, Manager, or Guest accounts
 * @access  Protected (ADMIN only)
 */
export async function createUser(req, res) {
  try {
    const { name, email, phone, password, role, department, room, isOnDuty } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check duplicate email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Validate department reference if role is STAFF
    if (role === USER_ROLES.STAFF && department) {
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({
          success: false,
          message: 'Specified department does not exist.',
        });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : '',
      password: hashedPassword,
      role: role || USER_ROLES.GUEST,
      department: role === USER_ROLES.STAFF ? department : null,
      room: role === USER_ROLES.GUEST ? room : null,
      isOnDuty: isOnDuty !== undefined ? isOnDuty : true,
      isActive: true,
    });

    if (newUser.role === USER_ROLES.GUEST && !newUser.room) {
      await assignUniqueRoomToGuest(newUser);
    }

    const populatedUser = await User.findById(newUser._id)
      .populate('department', 'name code icon')
      .populate('room', 'roomNumber floor roomType status');

    return res.status(201).json({
      success: true,
      message: `User created successfully with role ${newUser.role}`,
      data: { user: sanitizeUser(populatedUser) },
    });
  } catch (error) {
    console.error('[CreateUser Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user account.',
    });
  }
}

/**
 * @route   GET /api/users
 * @desc    List hotel users with optional role & department filtering
 * @access  Protected (ADMIN, MANAGER)
 */
export async function listUsers(req, res) {
  try {
    const { role, department, isActive, search } = req.query;
    const filter = {};

    if (role && Object.values(USER_ROLES).includes(role)) {
      filter.role = role;
    }

    if (department) {
      filter.department = department;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('department', 'name code icon')
      .populate('room', 'roomNumber floor')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Users retrieved',
      count: users.length,
      data: { users: users.map(sanitizeUser) },
    });
  } catch (error) {
    console.error('[ListUsers Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to list users.',
    });
  }
}

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Update user active or on-duty status
 * @access  Protected (ADMIN only)
 */
export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive, isOnDuty } = req.body;
    const updates = {};

    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isOnDuty !== undefined) updates.isOnDuty = Boolean(isOnDuty);

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error('[UpdateUserStatus Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status.',
    });
  }
}

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Admin updates user's role and departmental assignment
 * @access  Protected (ADMIN only)
 */
export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role, department, room } = req.body;

    if (!role || !Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Must be one of: ${Object.values(USER_ROLES).join(', ')}.`,
      });
    }

    const updates = { role };

    if (role === USER_ROLES.STAFF) {
      if (department) {
        const deptExists = await Department.findById(department);
        if (!deptExists) {
          return res.status(400).json({
            success: false,
            message: 'Specified department does not exist.',
          });
        }
        updates.department = department;
      }
      updates.isOnDuty = true;
    } else {
      updates.department = null;
    }

    if (role === USER_ROLES.GUEST) {
      if (room) updates.room = room;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code icon')
      .populate('room', 'roomNumber floor roomType status');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (user.role === USER_ROLES.GUEST && !user.room) {
      await assignUniqueRoomToGuest(user);
      await user.populate('room', 'roomNumber floor roomType status');
    }

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to ${user.role}`,
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error('[UpdateUserRole Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
}

/**
 * @route   PATCH /api/users/me/switch-role
 * @desc    Development/Testing helper: Switch current authenticated user's role
 * @access  Protected (Development mode only)
 */
export async function switchMyRole(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Self-service role switching is disabled in production. Contact hotel administrator.',
      });
    }

    const { role, departmentId } = req.body;
    if (!role || !Object.values(USER_ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Must be one of: ${Object.values(USER_ROLES).join(', ')}.`,
      });
    }

    const updates = { role };

    if (role === USER_ROLES.STAFF) {
      let dept = null;
      if (departmentId) {
        dept = await Department.findById(departmentId);
      }
      if (!dept) {
        dept = await Department.findOne({ isActive: true });
      }
      updates.department = dept ? dept._id : null;
      updates.isOnDuty = true;
    } else {
      updates.department = null;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code icon')
      .populate('room', 'roomNumber floor roomType status');

    if (updatedUser.role === USER_ROLES.GUEST && !updatedUser.room) {
      await assignUniqueRoomToGuest(updatedUser);
      await updatedUser.populate('room', 'roomNumber floor roomType status');
    }

    // Generate fresh JWT token reflecting the updated role
    const token = generateToken(updatedUser);

    return res.status(200).json({
      success: true,
      message: `Switched active role to ${updatedUser.role}`,
      data: {
        user: sanitizeUser(updatedUser),
        token,
      },
    });
  } catch (error) {
    console.error('[SwitchMyRole Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to switch role.',
    });
  }
}
