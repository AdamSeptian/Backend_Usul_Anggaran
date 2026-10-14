import express from "express";
import {
    getAnggarans,
    getAnggaranById,
    createAnggaranItem,
    updateAnggaranItem,
    deleteAnggaranItem,
} from "../controllers/Anggaran.js";
import { verifyUser, operatorUnitOnly } from "../middleware/AuthUser.js";

const router = express.Router();

// Bisa dilihat oleh role yang berkepentingan (operator unit & verifikator)
router.get("/anggarans", verifyUser, getAnggarans);
router.get("/anggarans/:id", verifyUser, getAnggaranById);

// Penambahan, pengeditan, dan penghapusan item rincian anggaran oleh Operator Unit (selama status draft/revisi)
router.post("/anggarans", verifyUser, operatorUnitOnly, createAnggaranItem);
router.patch("/anggarans/:id", verifyUser, operatorUnitOnly, updateAnggaranItem);
router.delete("/anggarans/:id", verifyUser, operatorUnitOnly, deleteAnggaranItem);

export default router;