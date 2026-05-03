import {loginUser, registerUser} from "../controllers/auth.controller.js";
import { Router } from "express";
import {userLoginValidator, userRegisterValidator} from "../validators/index.js";
import {validate} from "../middlewares/validator.middleware.js"

const router=Router()

router.post("/register", userRegisterValidator(), validate, registerUser)
router.post("/login",userLoginValidator(),validate,loginUser)

export default router
