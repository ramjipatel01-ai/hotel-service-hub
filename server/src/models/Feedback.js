import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Request reference is required'],
      unique: true,
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest reference is required'],
      index: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    comment: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Feedback comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases
feedbackSchema.virtual('requestId').get(function () {
  return this.request;
}).set(function (v) {
  this.request = v;
});

feedbackSchema.virtual('guestId').get(function () {
  return this.guest;
}).set(function (v) {
  this.guest = v;
});

feedbackSchema.virtual('staffId').get(function () {
  return this.staff;
}).set(function (v) {
  this.staff = v;
});

feedbackSchema.virtual('departmentId').get(function () {
  return this.department;
}).set(function (v) {
  this.department = v;
});

// Strategic analytics indexes
feedbackSchema.index({ department: 1, rating: 1 });
feedbackSchema.index({ staff: 1, rating: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
