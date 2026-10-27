import mongoose from 'mongoose';
import { REQUEST_PRIORITY, REQUEST_STATUS, SERVICE_CATEGORIES } from '../config/constants.js';

const requestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: [true, 'Request number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest reference is required'],
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required'],
      index: true,
    },
    serviceTitle: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: Object.values(SERVICE_CATEGORIES),
        message: '{VALUE} is not a valid service category',
      },
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(REQUEST_PRIORITY),
        message: '{VALUE} is not a valid priority level',
      },
      default: REQUEST_PRIORITY.NORMAL,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(REQUEST_STATUS),
        message: '{VALUE} is not a valid request status',
      },
      default: REQUEST_STATUS.PENDING,
      index: true,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    preferredTime: {
      type: Date,
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
    },

    // Lifecycle audit timestamps
    assignedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for compatibility with architecture.md
requestSchema.virtual('guestId').get(function () {
  return this.guest;
}).set(function (v) {
  this.guest = v;
});

requestSchema.virtual('roomId').get(function () {
  return this.room;
}).set(function (v) {
  this.room = v;
});

requestSchema.virtual('departmentId').get(function () {
  return this.department;
}).set(function (v) {
  this.department = v;
});

requestSchema.virtual('serviceId').get(function () {
  return this.service;
}).set(function (v) {
  this.service = v;
});

requestSchema.virtual('assignedStaffId').get(function () {
  return this.assignedStaff;
}).set(function (v) {
  this.assignedStaff = v;
});

// Strategic compound indexes for high-frequency queries
requestSchema.index({ guest: 1, status: 1 });
requestSchema.index({ department: 1, status: 1 });
requestSchema.index({ department: 1, createdAt: -1 });
requestSchema.index({ assignedStaff: 1, status: 1 });
requestSchema.index({ status: 1, priority: 1, createdAt: -1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ completedAt: -1 });

const Request = mongoose.model('Request', requestSchema);

export default Request;
