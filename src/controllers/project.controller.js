import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { Project } from "../models/project.schema.js";
import { UserRolesEnum } from "../utils/constants.js";
import { User } from "../models/user.schema.js";


const getProjects=asyncHandler(async(req,res)=>{
    const userId=req.user._id;

    const Projects=await Project.find({
        $or: [
            { createdBy:userId },
            { "members.user": userId },
        ],
    },
    {
        isDeleted:false
    }
).sort({
        createdAt:-1
    });

    return res.status(200).json(new ApiResponse(200,Projects,"Projects fetched successfully"))
})

const createProject=asyncHandler(async(req,res)=>{
    const {name,description}=req.body;

    const userId=req.user._id;

    const project=await Project.create({
        name,
        description,
        members:[{user:userId,role:"admin"}],
        createdBy:userId,
    });

    return res.status(201).json(new ApiResponse(201,project,"Project created successfully"))
})

const getProjectDetails=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;
    const userId=req.user._id;

    const project=await Project.findOne({
        _id: projectId,
        $or: [
            { createdBy:userId },
            { "members.user": userId },
        ],
    });

    if(!project){
        throw new ApiError(404,"Project not found or access denied");
    }

    return res.status(200).json(new ApiResponse(200,project,"Project details fetched successfully"))
})

const updateProject=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;
    const {name,description}=req.body;
    const userId=req.user._id;

    const findProject=await Project.findById(projectId);

    if(!findProject){
        throw new ApiError(404,"Project not found");
    }

    const members=findProject.members.find(({user})=>user.toString()===userId.toString());

    if(!members || members.role!=="admin"){
        throw new ApiError(403,"You are not authorized to update this project");
    }

    const project=await Project.findOneAndUpdate(
        {_id:projectId,createdBy:userId},
        {name,description},
        {new:true}
    );

    return res.status(200).json(new ApiResponse(200,project,"Project updated successfully"))
})

const addProjectMembers=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;
    const {email,role}=req.body;
    const userId=req.user._id;

    const findProject=await Project.findById(projectId);

    if(!findProject){
        throw new ApiError(404,"Project not found");
    }

    const members=findProject.members.find(({user})=>user.toString()===userId.toString());

    if(!members || members.role!==UserRolesEnum.ADMIN){
        throw new ApiError(403,"You are not authorized to add members to this project");
    }

    const newMember=await User.findOne({email});

    if(!newMember){
        throw new ApiError(404,"User not found");
    }

    findProject.members.push({user:newMember._id,role});

    await findProject.save();
    console.log("findProject->",findProject)
    return res.status(200).json(new ApiResponse(200,findProject,"Member added to project successfully"))
    
})

const getProjectMembers=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;

    const findProject=await Project.findById(projectId);

    if(!findProject){
        throw new ApiError(404,"Project not found");
    }

    const members = await Promise.all(
        findProject.members.map(async (member) => {
            const findUser = await User.findById(member.user);

            if (!findUser) {
                return null;
            }

            return {
                _id: findUser._id,
                email: findUser.email,
                role: member.role,
            };
        })
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            members.filter(Boolean),
            "Project members fetched successfully"
        )
    );
})

const deleteProject=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;
    const userId=req.user._id;

    const findProject=await Project.findById(projectId);

    if(!findProject){
        throw new ApiError(404,"Project not found");
    }
    
    const members=findProject.members.find(({user})=>user.toString()===userId.toString());

    if(!members || members.role!==UserRolesEnum.ADMIN){
        throw new ApiError(403,"You are not authorized to delete this project");
    }
    
    await Project.findByIdAndUpdate(projectId,{isDeleted:true,deletedAt:Date.now()});

    return res.status(200).json(new ApiResponse(200,findProject,"Project deleted successfully"))
    
})

const updateProjectMemberRole=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;
    const {user,role}=req.body;
    const userId=req.user._id;

    const findProject=await Project.findById(projectId);

    if(!findProject){
        throw new ApiError(404,"Project not found");
    }

    const members=findProject.members.find(({user})=>user.toString()===userId.toString());

    if(!members || members.role!==UserRolesEnum.ADMIN){
        throw new ApiError(403,"You are not authorized to update the role of this member");
    }

    let targetUserId = user;

    if (!user) {
        throw new ApiError(400, "User is required");
    }

    const isObjectId =
        typeof user === "string" &&
        user.match(/^[0-9a-fA-F]{24}$/);

    if (!isObjectId) {
        const targetUser = await User.findOne({ email: user });

        if (!targetUser) {
            throw new ApiError(404, "User not found");
        }

        targetUserId = targetUser._id;
    }

    const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId, "members.user": targetUserId },
        { $set: { "members.$.role": role } },
        { new: true }
    );

    if (!updatedProject) {
        throw new ApiError(404, "Project member not found");
    }

    return res.status(200).json(new ApiResponse(200,updatedProject,"Member role updated successfully"))
})

const removeProjectMember=asyncHandler(async(req,res)=>{
    const {projectId}=req.params;
    const {deletedUserMember}=req.body;
    const userId=req.user._id;

    const findProject=await Project.findById(projectId);

    if(!findProject){
        throw new ApiError(404,"Project not found");
    }

    const members=findProject.members.find(({user})=>user.toString()===userId.toString());

    if(!members || members.role!==UserRolesEnum.ADMIN){
        throw new ApiError(403,"You are not authorized to remove this member");
    }

    await Project.findByIdAndUpdate(projectId,{members:findProject.members.filter(({user})=>user.toString()!==deletedUserMember.toString())});

    return res.status(200).json(new ApiResponse(200,findProject,"Member removed from project successfully"))
})

export { getProjects,createProject,getProjectDetails,updateProject,addProjectMembers,getProjectMembers,deleteProject,updateProjectMemberRole,removeProjectMember};