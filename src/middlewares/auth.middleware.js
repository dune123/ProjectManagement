import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { User } from '../models/user.schema.js';
import jwt from 'jsonwebtoken';

export const verifyToken=asyncHandler(async(req,res,next)=>{
    const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return next(new ApiError(401,"Unauthorized"));
    }

    try{
        const decoded=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("decoded->",decoded)
        const user = await User.findById(decoded?._id).select(
      "-password -refreshToken -emailVerificationOtp -emailVerificationOtpExpiry -emailVerificationOtpAttempts -emailVerificationOtpLastSentAt -forgotPasswordToken -forgotPasswordExpiry",
    );

        if (!user) {
            return next(new ApiError(401, "Invalid access token"));
        }
        req.user = user;
        return next();
    }
    catch(err){
        return next(new ApiError(401, "Invalid access token"));
    }
})
