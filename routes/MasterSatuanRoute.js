import express from "express";
import { getMasterSatuans, createMasterSatuan, updateMasterSatuan, deleteMasterSatuan } from "../controllers/MasterSatuan.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();
router.get("/master-satuans", getMasterSatuans);
router.post("/master-satuans", verifyUser, superadminOnly, createMasterSatuan);
router.patch("/master-satuans/:code", verifyUser, superadminOnly, updateMasterSatuan);
router.delete("/master-satuans/:code", verifyUser, superadminOnly, deleteMasterSatuan);

export default router;
