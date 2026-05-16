import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  sendEmail,
  emailVerificationOtpMailgenContent,
  forgotPasswordMailgenContent,
} from "../utils/mail.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const USER_PRIVATE_FIELDS =
  "-password -refreshToken -emailVerificationOtp -emailVerificationOtpExpiry -emailVerificationOtpAttempts -emailVerificationOtpLastSentAt -forgotPasswordToken -forgotPasswordExpiry";

const OTP_MAX_ATTEMPTS = Number(process.env.EMAIL_OTP_MAX_ATTEMPTS) || 5;
const OTP_RESEND_COOLDOWN_SECONDS =
  Number(process.env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS) || 60;
const OTP_EXPIRY_MINUTES = Number(process.env.EMAIL_OTP_EXPIRY_MINUTES) || 10;

const RESEND_SUCCESS_MESSAGE =
  "If an account exists with this email, a verification code has been sent";

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const assertResendCooldown = (user) => {
  if (!user.emailVerificationOtpLastSentAt) return;

  const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS * 1000;
  const elapsed = Date.now() - user.emailVerificationOtpLastSentAt.getTime();

  if (elapsed < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
    throw new ApiError(
      429,
      `Please wait ${waitSeconds} seconds before requesting a new code`,
    );
  }
};

const assignAndSendVerificationOtp = async (user) => {
  assertResendCooldown(user);

  const { otp, hashedOtp, expiry } = user.generateEmailVerificationOtp();

  user.emailVerificationOtp = hashedOtp;
  user.emailVerificationOtpExpiry = expiry;
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationOtpLastSentAt = new Date();

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Your email verification code",
    mailgenContent: emailVerificationOtpMailgenContent(
      user.username,
      otp,
      OTP_EXPIRY_MINUTES,
    ),
  });
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError(
      500,
      error?.message || "Something went wrong while generating access token",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "User with the same email or username already exists",
    );
  }

  const user = await User.create({
    email,
    username,
    password,
    isEmailVerified: false,
  });

  try {
    await assignAndSendVerificationOtp(user);
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw new ApiError(
      500,
      error?.message || "Failed to send verification email. Please try again.",
    );
  }

  const createdUser = await User.findById(user._id).select(USER_PRIVATE_FIELDS);

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      { user: createdUser },
      "User registered successfully. A verification code has been sent to your email.",
    ),
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found with this email");
  }

  const isPasswordCompare = await user.isPasswordCorrect(password);

  if (!isPasswordCompare) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id);

  const loggedIn = await User.findById(user._id).select(USER_PRIVATE_FIELDS);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(200, { user: loggedIn }, "User logged in successfully"),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: req.user }, "Current user fetched successfully"),
    );
});

const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  if (user.emailVerificationOtpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "Maximum verification attempts exceeded. Please request a new code.",
    );
  }

  const hashedOtp = hashOtp(otp);

  const isValidOtp =
    user.emailVerificationOtp === hashedOtp &&
    user.emailVerificationOtpExpiry &&
    user.emailVerificationOtpExpiry.getTime() > Date.now();

  if (!isValidOtp) {
    user.emailVerificationOtpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, "Invalid or expired OTP");
  }

  user.emailVerificationOtp = undefined;
  user.emailVerificationOtpExpiry = undefined;
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationOtpLastSentAt = undefined;
  user.isEmailVerified = true;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      { isEmailVerified: true },
      "Email verified successfully",
    ),
  );
});

const resendEmailVerificationOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  await assignAndSendVerificationOtp(user);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Verification code sent to your email"));
});

const resendEmailVerificationOtpPublic = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (user && !user.isEmailVerified) {
    try {
      await assignAndSendVerificationOtp(user);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429) {
        throw error;
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, RESEND_SUCCESS_MESSAGE));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exists", []);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent on your mail id",
      ),
    );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(489, "Token is invalid or expired");
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyEmailOtp,
  resendEmailVerificationOtp,
  resendEmailVerificationOtpPublic,
  refreshAccessToken,
  resetForgotPassword,
  forgotPasswordRequest,
  changeCurrentPassword,
};
