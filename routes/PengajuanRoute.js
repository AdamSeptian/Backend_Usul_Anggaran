import express from "express";
import { getPengajuans, getPengajuanById, createPengajuan, verifyPengajuan, resubmitPengajuan } from "../controllers/Pengajuan.js";
import { verifyUser, operatorUnitOnly, allowRoles } from "../middleware/AuthUser.js";

import { getBudgetDetailReport } from "../controllers/BudgetDetailReport.js";

const router = express.Router();

router.get("/laporan/anggaran-detail", verifyUser, getBudgetDetailReport);
router.get("/pengajuans", verifyUser, getPengajuans);
router.get("/pengajuans/:id", verifyUser, getPengajuanById);
router.post("/pengajuans", verifyUser, operatorUnitOnly, createPengajuan);
router.patch("/pengajuans/:id/resubmit", verifyUser, operatorUnitOnly, resubmitPengajuan);
router.patch("/pengajuans/:id/verify", verifyUser, allowRoles("pimpinan_unit", "tim_sakip", "spi", "kpa"), verifyPengajuan);

export default router;
