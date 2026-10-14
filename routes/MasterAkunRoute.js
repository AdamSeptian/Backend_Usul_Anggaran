import express from "express";
import {
    getMasterAkuns,
    getMasterAkunByKode,
    createMasterAkun,
    updateMasterAkun,
    deleteMasterAkun,
} from "../controllers/MasterAkun.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/master-akuns", getMasterAkuns);
router.get("/master-akuns/:id", getMasterAkunByKode);

router.post("/master-akuns", verifyUser, superadminOnly, createMasterAkun);
router.patch("/master-akuns/:id", verifyUser, superadminOnly, updateMasterAkun);
router.delete("/master-akuns/:id", verifyUser, superadminOnly, deleteMasterAkun);

export default router;