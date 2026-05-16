import {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerificationOtp,
  resendEmailVerificationOtpPublic,
  resetForgotPassword,
  verifyEmailOtp,
} from "../controllers/auth.controller.js";
import { Router } from "express";
import {
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userLoginValidator,
  userRegisterValidator,
  userResendVerificationOtpValidator,
  userResetForgotPasswordValidator,
  userVerifyEmailOtpValidator,
} from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireVerifiedEmail } from "../middlewares/verify-email.middleware.js";

const router = Router();

router.post("/register", userRegisterValidator(), validate, registerUser);
router.post("/login", userLoginValidator(), validate, loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post(
  "/forgot-password",
  userForgotPasswordValidator(),
  validate,
  forgotPasswordRequest,
);
router.post(
  "/reset-password/:resetToken",
  userResetForgotPasswordValidator(),
  validate,
  resetForgotPassword,
);

router.post("/logout", verifyToken, logoutUser);
router.get("/current-user", verifyToken, getCurrentUser);
router.post(
  "/verify-email-otp",
  verifyToken,
  userVerifyEmailOtpValidator(),
  validate,
  verifyEmailOtp,
);
router.post(
  "/resend-email-verification",
  verifyToken,
  resendEmailVerificationOtp,
);
router.post(
  "/resend-verification-otp",
  userResendVerificationOtpValidator(),
  validate,
  resendEmailVerificationOtpPublic,
);
router.post(
  "/change-password",
  verifyToken,
  requireVerifiedEmail,
  userChangeCurrentPasswordValidator(),
  validate,
  changeCurrentPassword,
);

export default router;
