import express from "express";
import { getMasterSatuans, createMasterSatuan } from "../controllers/MasterSatuan.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();
router.get("/master-satuans", getMasterSatuans);
router.post("/master-satuans", verifyUser, superadminOnly, createMasterSatuan);

export default router;