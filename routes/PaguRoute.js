import express from "express";
import {
    getPagus,
    getPaguById,
    getPaguByUnitKerja, // 1. Import fungsi controller baru
    createPagu,
    updatePagu,
    deletePagu,
} from "../controllers/Pagu.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

// Route untuk melihat pagu khusus unit kerja yang sedang login (Harus diletakkan DI ATAS /pagus/:id agar tidak dianggap ID)
router.get("/pagus/unit-kerja", verifyUser, getPaguByUnitKerja);

router.get("/pagus", verifyUser, getPagus);
router.get("/pagus/:id", verifyUser, getPaguById);

router.post("/pagus", verifyUser, superadminOnly, createPagu);
router.patch("/pagus/:id", verifyUser, superadminOnly, updatePagu);
router.delete("/pagus/:id", verifyUser, superadminOnly, deletePagu);

export default router;
