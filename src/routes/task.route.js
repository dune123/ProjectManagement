import { Router } from "express";
import { AddSubtasks, createTask, deleteSubtask, deleteTask, getTaskDetails, getTasks, updateTask } from "../controllers/task.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { requireVerifiedEmail } from "../middlewares/verify-email.middleware.js";

const router=Router();

router.use(verifyToken, requireVerifiedEmail);

router.post("/:projectId",createTask);
router.get("/:projectId",getTasks);
router.get("/:projectId/t/:taskId",getTaskDetails);
router.put("/:projectId/t/:taskId",updateTask)
router.delete("/:projectId/t/:taskId",deleteTask)
router.post("/:projectId/t/:taskId/subtasks",AddSubtasks)
router.delete("/:projectId/t/:taskId/subtasks/:subtaskId",deleteSubtask)

export default router;