import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatues, TaskStatusEnum } from "../utils/constants.js";

const subtaskSchema=new Schema({
    title:{
        type:String,
        required:[true,"Title is required"],
        trim:true,
        index:true,
    },
    isCompleted:{
        type:Boolean,
        default:false,
    },
    assignedTo:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    completedAt:{
        type:Date,
        default:null,
    }
},{
    _id:true,
})

const attachmentSchema=new Schema({
    url:{
        type:String,
        required:[true,"Attachment URL is required"],
        trim:true,
    },
    mimeType:{
        type:String,
        required:[true,"Attachment MIME type is required"],
        trim:true,
    },
    size:{
        type:Number,
        required:[true,"Attachment size is required"],
        min:0,
    },
    uploadedBy:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:[true,"Uploaded by is required"],
    },
    uploadedAt:{
        type:Date,
        default:Date.now,
    },
},{
    _id:true,
})

const taskSchema=new Schema({
    project:{
        type:Schema.Types.ObjectId,
        ref:"Project",
        required:[true,"Project is required"],
    },
    title:{
        type:String,
        required:[true,"Title is required"],
        trim:true,
        index:true,
    },
    description:{
        type:String,
        trim:true,
    },
    status:{
        type:String,
        enum:AvailableTaskStatues,
        default:TaskStatusEnum.TODO,
    },
    createdBy:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:[true,"Created by is required"],
    },
    assignee:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    attachments:{
        type:[attachmentSchema],
        default:[],
    },
    subtasks:{
        type:[subtaskSchema],
        default:[],
    }
},
{
    timestamps:true,
})

taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1 });

export const Task=mongoose.model("Task",taskSchema);