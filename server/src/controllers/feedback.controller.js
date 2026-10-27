import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Request from '../models/Request.js';
import { REQUEST_STATUS, USER_ROLES } from '../config/constants.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Submit feedback for a confirmed request
 * POST /api/feedback
 */
export async function createFeedback(req, res, next) {
  try {
    const { requestId, rating, comment } = req.body;

    // 1. Validate requestId
    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid requestId is required.',
      });
    }

    // 2. Validate rating (integer 1-5)
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
      });
    }

    // 3. Validate comment length if provided
    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
    if (trimmedComment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment cannot exceed 1000 characters.',
      });
    }

    // 4. Find the target Request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found.',
      });
    }

    // 5. Enforce guest ownership (or Admin)
    const isOwner = String(request.guest) === String(req.user._id);
    const isAdmin = req.user.role === USER_ROLES.ADMIN;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit feedback for your own service requests.',
      });
    }

    // 6. Enforce eligibility: Must be in CONFIRMED state
    if (request.status !== REQUEST_STATUS.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: `Feedback can only be submitted once the service request is confirmed (current status: "${request.status}").`,
      });
    }

    // 7. Enforce one feedback per request constraint
    const existingFeedback = await Feedback.findOne({ request: requestId });
    if (existingFeedback) {
      return res.status(409).json({
        success: false,
        message: 'Feedback has already been submitted for this request.',
      });
    }

    // 8. Create feedback record
    const feedback = await Feedback.create({
      request: request._id,
      guest: req.user._id,
      staff: request.assignedStaff || null,
      department: request.department,
      rating: numericRating,
      comment: trimmedComment,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your rating has been recorded.',
      data: {
        feedback: {
          _id: feedback._id,
          requestId: feedback.request,
          rating: feedback.rating,
          comment: feedback.comment,
          createdAt: feedback.createdAt,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Feedback has already been submitted for this request.',
      });
    }
    next(error);
  }
}

/**
 * Get feedback for a specific request
 * GET /api/feedback/request/:requestId
 */
export async function getFeedbackByRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    if (!requestId || !isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid requestId is required.',
      });
    }

    const feedback = await Feedback.findOne({ request: requestId })
      .populate('guest', 'name email')
      .populate('staff', 'name')
      .lean();

    if (!feedback) {
      return res.status(200).json({
        success: true,
        data: { feedback: null },
      });
    }

    // Role-based scoping: Guest can only view feedback for their own request
    if (req.user.role === USER_ROLES.GUEST) {
      const guestId = (feedback.guest?._id || feedback.guest)?.toString();
      if (guestId !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot view feedback for another guest.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
}
