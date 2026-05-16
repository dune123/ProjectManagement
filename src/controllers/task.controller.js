import { asyncHandler } from "../utils/async-handler.js";
import { Task } from "../models/task.schema.js";
import { Project } from "../models/project.schema.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { TaskStatusEnum, UserRolesEnum } from "../utils/constants.js";

export const createTask=asyncHandler(async(req,res)=>{
    const projectId=req.params.projectId;
    const userId=req.user._id;
    const {title,description,assignee,subtasks,attachments}=req.body;
    const project=await Project.findOne({_id:projectId,isDeleted:false});
    
    if(!project){
        throw new ApiError(404,"Project not found");
    }

    const members = project.members.find(
        ({ user }) => user.toString() === userId.toString()
    );

    if (
        !members ||
        ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(members.role)
    ) {
        throw new ApiError(403,"You are not authorized to create a task in this project");
    }

    const task=await Task.create({project:projectId,title,description,assignee,subtasks,attachments,createdBy:userId});
    res.status(200).json(new ApiResponse(200,task,"Task created successfully"));
})

export const getTasks=asyncHandler(async(req,res)=>{
    const projectId=req.params.projectId;
    const userId=req.user._id;
    const tasks=await Task.find({project:projectId,createdBy:userId});
    res.status(200).json(new ApiResponse(200,tasks,"Tasks fetched successfully"));
})

//GET /:projectId/t/:taskId - Get task details (secured, role-based)
export const getTaskDetails=asyncHandler(async(req,res)=>{
    const { projectId, taskId } = req.params;
    const userId=req.user._id;

    const project=await Project.findOne({_id:projectId,isDeleted:false});
    if(!project){
        throw new ApiError(404,"Project not found");
    }

    const members = project.members.find(
        ({ user }) => user.toString() === userId.toString()
    );

    if (
        !members ||
        ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(members.role)
    ){
        throw new ApiError(403,"You are not authorized to get task details in this project");
    }

    const task=await Task.findOne({_id:taskId,project:projectId});
    if(!task){
        throw new ApiError(404,"Task not found");
    }

    res.status(200).json(new ApiResponse(200,task,"Task details fetched successfully"));
})

export const updateTask=asyncHandler(async(req,res)=>{
    const {projectId,taskId}=req.params;
    const {taskName}=req.body
    const userId=req.user._id;

    const project=await Project.findOne({_id:projectId,isDeleted:false});
    if(!project){
        throw new ApiError(404,"Project not found");
    }

    const members = project.members.find(
        ({ user }) => user.toString() === userId.toString()
    );
    
    if(!members || ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(members.role)){
        throw new ApiError(403,"You are not authorized to update this task");
    }

    const task=await Task.findOne({_id:taskId,project:projectId});
    if(!task){
        throw new ApiError(404,"Task not found");
    }

    const updatedTask=await Task.findOneAndUpdate({_id:taskId,project:projectId},{$set:{task:taskName}},{new:true});
    res.status(200).json(new ApiResponse(200,updatedTask,"Task updated successfully"));
})

///:projectId/t/:taskId
export const deleteTask=asyncHandler(async(req,res)=>{
    const {projectId,taskId}=req.params;
    const userId=req.user._id;

    const project=await Project.findOne({_id:projectId,isDeleted:false});
    if(!project){
        throw new ApiError(404,"Project not found");
    }

    const members = project.members.find(
        ({ user }) => user.toString() === userId.toString()
    );
    
    if(!members || ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(members.role)){
        throw new ApiError(403,"You are not authorized to delete this task");
    }

    const deletedTask=await Task.findOneAndDelete({_id:taskId,project:projectId});
    if(!deletedTask){
        throw new ApiError(404,"Task not found");
    }

    res.status(200).json(new ApiResponse(200,deletedTask,"Task deleted successfully"));
})

///:projectId/t/:taskId/subtasks
export const AddSubtasks=asyncHandler(async(req,res)=>{
    const {projectId,taskId}=req.params;
    const {subtasks}=req.body;
    const userId=req.user._id;

    const project=await Project.findOne({_id:projectId,isDeleted:false});
    if(!project){
        throw new ApiError(404,"Project not found");
    }
    
    const members = project.members.find(
        ({ user }) => user.toString() === userId.toString()
    );
    
    if(!members || ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(members.role)){
        throw new ApiError(403,"You are not authorized to add subtasks to this task");
    }
    
    
    const task=await Task.findOne({_id:taskId,project:projectId});
    if(!task){
        throw new ApiError(404,"Task not found");
    }

    const updatedTask=await Task.findOneAndUpdate({_id:taskId,project:projectId},{$push:{subtasks}},{new:true});
    res.status(200).json(new ApiResponse(200,updatedTask,"Subtasks added successfully"));
})

export const deleteSubtask=asyncHandler(async(req,res)=>{
    const {projectId,taskId,subtaskId}=req.params;
    const userId=req.user._id;

    const project=await Project.findOne({_id:projectId,isDeleted:false});
    if(!project){
        throw new ApiError(404,"Project not found");
    }
    
    const members = project.members.find(
        ({ user }) => user.toString() === userId.toString()
    );
    
    if(!members || ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(members.role)){
        throw new ApiError(403,"You are not authorized to delete this subtask");
    }
    
    const task=await Task.findOne({_id:taskId,project:projectId});
    if(!task){
        throw new ApiError(404,"Task not found");
    }

    const subtaskExists=task.subtasks.some(
        (subtask)=>subtask._id.toString()===subtaskId.toString()
    );
    if(!subtaskExists){
        throw new ApiError(404,"Subtask not found");
    }

    task.subtasks=task.subtasks.filter(
        (subtask)=>subtask._id.toString()!==subtaskId.toString()
    );

    const updatedTask=await task.save();

    res.status(200).json(new ApiResponse(200,updatedTask,"Subtask deleted successfully"));
})

