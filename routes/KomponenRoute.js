import express from "express";
import {
    getKomponens,
    getKomponenById,
    createKomponen,
    updateKomponen,
    deleteKomponen,
} from "../controllers/Komponen.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/komponens", getKomponens);
router.get("/komponens/:id", getKomponenById);

router.post("/komponens", verifyUser, superadminOnly, createKomponen);
router.patch("/komponens/:id", verifyUser, superadminOnly, updateKomponen);
router.delete("/komponens/:id", verifyUser, superadminOnly, deleteKomponen);

export default router;