import mongoose from 'mongoose';
import { ROOM_STATUS, ROOM_TYPE } from '../config/constants.js';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
      min: [1, 'Floor must be at least 1'],
      index: true,
    },
    roomType: {
      type: String,
      enum: {
        values: Object.values(ROOM_TYPE),
        message: '{VALUE} is not a valid room type',
      },
      default: ROOM_TYPE.STANDARD,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ROOM_STATUS),
        message: '{VALUE} is not a valid room status',
      },
      default: ROOM_STATUS.AVAILABLE,
      index: true,
    },
    currentGuest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for type
roomSchema.virtual('type').get(function () {
  return this.roomType;
}).set(function (v) {
  this.roomType = v;
});

// Virtual alias for currentGuestId
roomSchema.virtual('currentGuestId').get(function () {
  return this.currentGuest;
}).set(function (v) {
  this.currentGuest = v;
});

// Compound index for finding available rooms by type
roomSchema.index({ status: 1, roomType: 1 });
roomSchema.index({ floor: 1, status: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
