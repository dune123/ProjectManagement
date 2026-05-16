import Router from "express";
import { addProjectMembers, createProject, deleteProject, getProjectDetails, getProjectMembers, getProjects, removeProjectMember, updateProject, updateProjectMemberRole } from "../controllers/project.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireVerifiedEmail } from "../middlewares/verify-email.middleware.js";

const router=Router();

router.use(verifyToken, requireVerifiedEmail);

router.get("/",getProjects);
router.post("/createProject",createProject);
router.get("/:projectId",getProjectDetails);
router.put("/updateProject/:projectId",updateProject);
router.post("/addProjectMembers/:projectId",addProjectMembers);
router.get("/getProjectMembers/:projectId",getProjectMembers);
router.delete("/deleteProject/:projectId",deleteProject);
router.put("/updateProjectMemberRole/:projectId",updateProjectMemberRole);
router.delete("/removeProjectMember/:projectId",removeProjectMember);

export default router;