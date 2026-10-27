import Room from '../models/Room.js';
import User from '../models/User.js';
import { ROOM_STATUS, ROOM_TYPE, USER_ROLES } from '../config/constants.js';

/**
 * Assigns a unique available room to a guest user if they don't already have one.
 * Ensures 1 room per guest — no two guests share the same room.
 *
 * @param {Object} user - Mongoose User document or user object
 * @returns {Promise<Object>} The updated User document
 */
export async function assignUniqueRoomToGuest(user) {
  if (!user || user.role !== USER_ROLES.GUEST) {
    return user;
  }

  const userId = user._id || user.id;

  // 1. If user already has a valid room assigned, verify that room in DB
  if (user.room) {
    const roomId = typeof user.room === 'object' ? (user.room._id || user.room.id) : user.room;
    const existingRoom = await Room.findById(roomId);

    if (existingRoom) {
      // Ensure the room points back to this user as currentGuest
      if (!existingRoom.currentGuest || existingRoom.currentGuest.toString() !== userId.toString()) {
        existingRoom.currentGuest = userId;
        if (existingRoom.status === ROOM_STATUS.AVAILABLE) {
          existingRoom.status = ROOM_STATUS.OCCUPIED;
        }
        await existingRoom.save();
      }
      return user;
    }
  }

  // 2. Collect all room IDs currently assigned to other users
  const assignedRoomIds = await User.find({
    room: { $ne: null },
    _id: { $ne: userId },
  }).distinct('room');

  // 3. Find an active room that is AVAILABLE and has no current guest
  let availableRoom = await Room.findOne({
    _id: { $nin: assignedRoomIds },
    isActive: true,
    currentGuest: null,
    status: ROOM_STATUS.AVAILABLE,
  }).sort({ floor: 1, roomNumber: 1 });

  // 4. Fallback: Any active room without a guest that is not under maintenance
  if (!availableRoom) {
    availableRoom = await Room.findOne({
      _id: { $nin: assignedRoomIds },
      isActive: true,
      currentGuest: null,
      status: { $ne: ROOM_STATUS.MAINTENANCE },
    }).sort({ floor: 1, roomNumber: 1 });
  }

  // 5. Fallback: Any active room without a guest
  if (!availableRoom) {
    availableRoom = await Room.findOne({
      _id: { $nin: assignedRoomIds },
      isActive: true,
      currentGuest: null,
    }).sort({ floor: 1, roomNumber: 1 });
  }

  // 6. If every single room in the hotel is occupied, dynamically create a new suite for this guest
  if (!availableRoom) {
    const existingRooms = await Room.find({}).sort({ roomNumber: -1 });
    let nextRoomNumber = '101';
    let nextFloor = 1;

    for (const r of existingRooms) {
      const parsed = parseInt(r.roomNumber, 10);
      if (!isNaN(parsed) && parsed > 0) {
        const nextNum = parsed + 1;
        nextRoomNumber = String(nextNum);
        nextFloor = Math.floor(nextNum / 100) || 1;
        break;
      }
    }

    // Safety check against roomNumber collisions
    const collision = await Room.findOne({ roomNumber: nextRoomNumber });
    if (collision) {
      nextRoomNumber = `R-${Date.now().toString().slice(-4)}`;
    }

    availableRoom = await Room.create({
      roomNumber: nextRoomNumber,
      floor: nextFloor,
      roomType: ROOM_TYPE.DELUXE,
      status: ROOM_STATUS.OCCUPIED,
      currentGuest: userId,
      isActive: true,
    });
  } else {
    // Claim the room for this guest
    availableRoom.currentGuest = userId;
    availableRoom.status = ROOM_STATUS.OCCUPIED;
    await availableRoom.save();
  }

  // 7. Persist the room assignment on the user document
  user.room = availableRoom._id;
  await user.save();

  return user;
}

/**
 * Sweeper utility to ensure all existing guest accounts in the database have their
 * own distinct room assigned.
 */
export async function ensureAllGuestsHaveUniqueRooms() {
  const guests = await User.find({ role: USER_ROLES.GUEST });
  for (const guest of guests) {
    await assignUniqueRoomToGuest(guest);
  }
}
