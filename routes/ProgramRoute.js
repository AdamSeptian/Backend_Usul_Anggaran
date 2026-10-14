import express from "express";
import {
    getPrograms,
    getProgramById,
    createProgram,
    updateProgram,
    deleteProgram,
} from "../controllers/Program.js"; // Pastikan path file controller sesuai

import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

// Semua role / publik bisa melihat data program (bisa pakai verifyUser atau dibiarkan publik tanpa auth)
router.get("/programs", getPrograms);
router.get("/programs/:id", getProgramById);

// Hanya Superadmin yang bisa menambah, mengedit, dan menghapus
router.post("/programs", verifyUser, superadminOnly, createProgram);
router.patch("/programs/:id", verifyUser, superadminOnly, updateProgram);
router.delete("/programs/:id", verifyUser, superadminOnly, deleteProgram);

export default router;