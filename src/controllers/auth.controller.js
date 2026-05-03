import {User} from '../models/user.schema.js';
import {asyncHandler} from "../utils/async-handler.js"
import {sendEmail, emailVerificationMailgenContent} from '../utils/mail.js';
import {ApiResponse} from '../utils/api-response.js';
import {ApiError} from '../utils/api-error.js';

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token",
    );
  }
};

const registerUser=asyncHandler(async(req,res,next)=>{
    const {email,username,password,role}=req.body

    const existingUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existingUser){
        throw new ApiError(409,"User with the same email or username already exists")
    }

    const user=await User.create({
        email,
        username,
        password,
        isEmailVerified:false,
    })

    const { unHashedToken, hashedToken, tokenExpiry } =user.generateTemporaryToken();

    user.emailVerificationToken=hashedToken;
    user.emailVerificationTokenExpiry=tokenExpiry;
    
    await user.save({validateBeforeSave:false})

    await sendEmail({
        email:user?.email,
        subject:"Please verify your email address",
        mailgenContent:emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
        )
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
    );
    
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
    }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully and verification email has been sent on your email",
      ),
    );
})

const loginUser=asyncHandler(async(req,res,next)=>{
    const {email, password}=req.body

    if(!email){
        throw new ApiError(400,"Please provide email to login")
    }

    const user=await User.findOne({email})

    if(!user){
        throw new ApiError(404,"User not found with this email")
    }

    const isPasswordCompare=await user.comparePassword(password)

    if(!isPasswordCompare){
        throw new ApiError(401,"Invalid credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedIn = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
    );
    
    const options={
      httpOnly:true,
      secure:true
    }

    return res
            .status(200)
            .cookie("refreshToken",refreshToken,options)
            .cookie("accessToken",accessToken,options)
            .json(
              new ApiResponse(
                200,
                { user: loggedIn },
                "User logged in successfully",
              ),
            );
})

export {
  registerUser, loginUser}