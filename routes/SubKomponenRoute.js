import express from "express";
import {
    getSubkomponens,
    getSubkomponenById,
    createSubkomponen,
    updateSubkomponen,
    deleteSubkomponen,
} from "../controllers/Subkomponen.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/subkomponens", getSubkomponens);
router.get("/subkomponens/:id", getSubkomponenById);

router.post("/subkomponens", verifyUser, superadminOnly, createSubkomponen);
router.patch("/subkomponens/:id", verifyUser, superadminOnly, updateSubkomponen);
router.delete("/subkomponens/:id", verifyUser, superadminOnly, deleteSubkomponen);

export default router;