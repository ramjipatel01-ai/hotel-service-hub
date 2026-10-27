import mongoose from 'mongoose';
import { HISTORY_ACTION, REQUEST_STATUS } from '../config/constants.js';

const requestHistorySchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Request reference is required'],
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User actor is required'],
      index: true,
    },
    previousStatus: {
      type: String,
      enum: {
        values: [...Object.values(REQUEST_STATUS), null],
        message: '{VALUE} is not a valid previous status',
      },
      default: null,
    },
    newStatus: {
      type: String,
      required: [true, 'New status is required'],
      enum: {
        values: Object.values(REQUEST_STATUS),
        message: '{VALUE} is not a valid new status',
      },
    },
    action: {
      type: String,
      required: [true, 'History action type is required'],
      enum: {
        values: Object.values(HISTORY_ACTION),
        message: '{VALUE} is not a recognized history action',
      },
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Audit trail uses strict immutable timestamp
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases
requestHistorySchema.virtual('requestId').get(function () {
  return this.request;
}).set(function (v) {
  this.request = v;
});

requestHistorySchema.virtual('actor').get(function () {
  return this.performedBy;
}).set(function (v) {
  this.performedBy = v;
});

requestHistorySchema.virtual('comment').get(function () {
  return this.notes;
}).set(function (v) {
  this.notes = v;
});

// Compound indexes for timeline queries
requestHistorySchema.index({ request: 1, timestamp: -1 });
requestHistorySchema.index({ performedBy: 1, timestamp: -1 });

const RequestHistory = mongoose.model('RequestHistory', requestHistorySchema);

export default RequestHistory;
