import mongoose,{Schema} from 'mongoose';
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

const userSchema=new Schema({
    avatar:{
        type:{
            url:String,
            localPath:String
        },
        default:{
            url:`https://placehold.co/200x200?text=No+Image`,
            localPath:''
        }
    },
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    fullName:{
        type:String,
        trim:true
    },
    password:{
        type:String,
        required:[true,"Password is required"]
    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    refreshToken:{
        type:String
    },
    forgotPasswordToken:{
        type:String
    },
    forgotPasswordTokenExpiry:{
        type:Date
    },
    emailVerificationToken:{
        type:String
    },
    emailVerificationTokenExpiry:{
        type:Date
    }
},
{
    timestamps:true
})

userSchema.pre('save',async function(){
    if (!this.isModified('password')) return

    this.password=await bcrypt.hash(this.password,10)
})

userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            username:this.username,
            email:this.email
        },
        process.env.ACCESS_TOKEN_SCERET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRE
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            username:this.username,
            email:this.email
        },
        process.env.REFRESH_TOKEN_SCERET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRE
        }
    )
}

userSchema.methods.generateTemporaryToken=function(){
    const unHashedToken=jwt.sign(
        {
            _id:this._id
        },
        process.env.TEMP_TOKEN_SECRET,
        {
            expiresIn:process.env.TEMP_TOKEN_EXPIRE||'15m'
        }
    )
    return {
        unHashedToken,
        hashedToken:unHashedToken,
        tokenExpiry:new Date(Date.now() + 15*60*1000)
    }
}

export const User=mongoose.model('User',userSchema)