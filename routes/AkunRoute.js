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
router.get("/akuns/:id", getAkunById);

router.post("/akuns", verifyUser, superadminOnly, createAkun);
router.patch("/akuns/:id", verifyUser, superadminOnly, updateAkun);
router.delete("/akuns/:id", verifyUser, superadminOnly, deleteAkun);

export default router;