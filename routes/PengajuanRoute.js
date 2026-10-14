import express from "express";
import { getPengajuans, createPengajuan, verifyPengajuan } from "../controllers/Pengajuan.js";
import { verifyUser, operatorUnitOnly, allowRoles } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/pengajuans", verifyUser, getPengajuans);
router.post("/pengajuans", verifyUser, operatorUnitOnly, createPengajuan);
router.patch("/pengajuans/:id/verify", verifyUser, allowRoles("pimpinan_unit", "tim_sakip", "spi", "kpa"), verifyPengajuan);

export default router;