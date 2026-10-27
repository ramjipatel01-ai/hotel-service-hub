import mongoose from 'mongoose';
import { REQUEST_PRIORITY, SERVICE_CATEGORIES } from '../config/constants.js';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [120, 'Service name cannot exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Service code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Service category is required'],
      enum: {
        values: Object.values(SERVICE_CATEGORIES),
        message: '{VALUE} is not a valid service category',
      },
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Associated department is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      trim: true,
      default: 'Sparkles',
    },
    defaultPriority: {
      type: String,
      enum: {
        values: Object.values(REQUEST_PRIORITY),
        message: '{VALUE} is not a valid request priority',
      },
      default: REQUEST_PRIORITY.NORMAL,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 30,
      min: [1, 'Estimated duration must be at least 1 minute'],
    },
    allowQuantity: {
      type: Boolean,
      default: false,
    },
    maxQuantity: {
      type: Number,
      default: 5,
      min: [1, 'Max quantity must be at least 1'],
    },
    allowImage: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
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

// Virtual alias for title
serviceSchema.virtual('title').get(function () {
  return this.name;
}).set(function (v) {
  this.name = v;
});

// Virtual alias for departmentId
serviceSchema.virtual('departmentId').get(function () {
  return this.department;
}).set(function (v) {
  this.department = v;
});

// Compound indexes for fast catalog searches and department queries
serviceSchema.index({ department: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
