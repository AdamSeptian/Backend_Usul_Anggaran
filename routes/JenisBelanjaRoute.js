import express from "express";
import {
    getJenisBelanjas,
    getJenisBelanjaById,
    createJenisBelanja,
    updateJenisBelanja,
    deleteJenisBelanja,
} from "../controllers/JenisBelanja.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/jenis-belanjas", getJenisBelanjas);
router.get("/jenis-belanjas/:id", getJenisBelanjaById);

router.post("/jenis-belanjas", verifyUser, superadminOnly, createJenisBelanja);
router.patch("/jenis-belanjas/:id", verifyUser, superadminOnly, updateJenisBelanja);
router.delete("/jenis-belanjas/:id", verifyUser, superadminOnly, deleteJenisBelanja);

export default router;