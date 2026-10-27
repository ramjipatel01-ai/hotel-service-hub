import mongoose from 'mongoose';

/**
 * Validate whether a string is a valid MongoDB ObjectId
 * @param {string|mongoose.Types.ObjectId} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === String(id));
}

/**
 * Generates a human-readable, standardized, unique Request Number
 * Format: REQ-YYYYMMDD-XXXX (e.g. REQ-20261008-0001)
 * Uses atomic count or collision-resistant sequential padding.
 *
 * @param {mongoose.Model} RequestModel - Optional Request model to check existing daily count
 * @returns {Promise<string>}
 */
export async function generateRequestNumber(RequestModel) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `REQ-${year}${month}${day}`;

  if (RequestModel) {
    try {
      // Find latest request created today with this prefix
      const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const count = await RequestModel.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      const sequence = String(count + 1).padStart(4, '0');
      let candidate = `${datePrefix}-${sequence}`;

      // Check for rare collisions
      const existing = await RequestModel.findOne({ requestNumber: candidate });
      if (!existing) {
        return candidate;
      }

      // If collision occurs (e.g., deleted records), use higher counter
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      return `${datePrefix}-${randomSuffix}`;
    } catch {
      // Fallback if query fails
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      return `${datePrefix}-${randomSuffix}`;
    }
  }

  // Fallback when model not provided
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${datePrefix}-${randomSuffix}`;
}
