import mongoose, { Schema } from "mongoose";
import { UserRolesEnum } from "../utils/constants.js";

const memberSchema = new Schema({
        user:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:[true,"User is required"],
        },
        role: {
            type: String,
            enum: [UserRolesEnum.ADMIN,UserRolesEnum.PROJECT_ADMIN,UserRolesEnum.MEMBER],
            required: true,
            default: "member",
        },
       joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
)

const projectSchema = new Schema(
    {
        name:{
            type:String,
            required:[true,"Project name is required"],
            trim:true,
            index:true,
        },
        description:{
            type:String,
            trim:true,
        },
        createdBy:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:[true,"Project owner is required"],
        },
        members:{
            type:[memberSchema],
            default:[],
        },
        memberCount: {
            type: Number,
            default: 0,
        },
        // Optional Soft Delete
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps:true,
    }
)

projectSchema.pre("save", function () {
    this.memberCount = this.members.length;
  });

/* ------------------------------------------
   Optional Query Middleware:
   Ignore Soft Deleted Projects Automatically
-------------------------------------------*/
projectSchema.pre(/^find/, function () {
    this.where({ isDeleted: false });
  });

projectSchema.index({ "members.user": 1 });
projectSchema.index({ createdBy: 1 });

export const Project = mongoose.model("Project", projectSchema);