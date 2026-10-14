import express from "express";
import {
    getKegiatans,
    getKegiatanById,
    createKegiatan,
    updateKegiatan,
    deleteKegiatan,
} from "../controllers/Kegiatan.js";

import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

// GET bisa diakses publik/semua role
router.get("/kegiatans", getKegiatans);
router.get("/kegiatans/:id", getKegiatanById);

// POST, PATCH, DELETE wajib login dan khusus Superadmin
router.post("/kegiatans", verifyUser, superadminOnly, createKegiatan);
router.patch("/kegiatans/:id", verifyUser, superadminOnly, updateKegiatan);
router.delete("/kegiatans/:id", verifyUser, superadminOnly, deleteKegiatan);

export default router;