import {registerUser} from "../controllers/auth.controller.js";
import { Router } from "express";
import {userRegisterValidator} from "../validators/index.js";
import {validate} from "../middlewares/validator.middleware.js"

const router=Router()

router.post("/register", userRegisterValidator(), validate, registerUser)

export default router
