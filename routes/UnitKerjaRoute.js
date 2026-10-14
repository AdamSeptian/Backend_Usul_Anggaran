import express from "express";
import {
    getUnitKerjas,
    getUnitKerjaById,
    createUnitKerja,
    updateUnitKerja,
    deleteUnitKerja,
} from "../controllers/UnitKerja.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

// GET bisa diakses bebas / semua role untuk keperluan form & dropdown
router.get("/unit-kerjas", getUnitKerjas);
router.get("/unit-kerjas/:id", getUnitKerjaById);

// POST, PATCH, DELETE wajib login dan khusus Superadmin
router.post("/unit-kerjas", verifyUser, superadminOnly, createUnitKerja);
router.patch("/unit-kerjas/:id", verifyUser, superadminOnly, updateUnitKerja);
router.delete("/unit-kerjas/:id", verifyUser, superadminOnly, deleteUnitKerja);

export default router;