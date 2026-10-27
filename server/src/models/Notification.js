import mongoose from 'mongoose';
import { NOTIFICATION_TYPE } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient user is required'],
      index: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: {
        values: Object.values(NOTIFICATION_TYPE),
        message: '{VALUE} is not a valid notification type',
      },
      default: NOTIFICATION_TYPE.REQUEST_CREATED,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases
notificationSchema.virtual('recipientId').get(function () {
  return this.user;
}).set(function (v) {
  this.user = v;
});

notificationSchema.virtual('requestId').get(function () {
  return this.request;
}).set(function (v) {
  this.request = v;
});

// Compound index for user inbox feeds and unread badge counts
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
