import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const requireVerifiedEmail = asyncHandler(async (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    return next(
      new ApiError(403, "Please verify your email to access this resource"),
    );
  }
  next();
});
