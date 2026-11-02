import express from "express";
import {
    getAkuns,
    getAkunById,
    createAkun,
    updateAkun,
    deleteAkun,
} from "../controllers/Akun.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/akuns", getAkuns);
router.get("/akuns/:kode_akun", getAkunById);

router.post("/akuns", verifyUser, superadminOnly, createAkun);
router.patch("/akuns/:kode_akun", verifyUser, superadminOnly, updateAkun);
router.delete("/akuns/:kode_akun", verifyUser, superadminOnly, deleteAkun);

export default router;