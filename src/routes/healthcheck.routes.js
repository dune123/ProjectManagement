import express from 'express';
import { healthCheck } from '../controllers/healthcheck.controller.js';

const router = express.Router();

router.get("/healthCheck",healthCheck)

export default router;