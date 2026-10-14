import express from "express";
import {
    getMasterSubkomponens,
    getMasterSubkomponenByKode,
    deleteMasterSubkomponen,
} from "../controllers/MasterSubkomponen.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/master-subkomponens", getMasterSubkomponens);
router.get("/master-subkomponens/:id", getMasterSubkomponenByKode);
router.delete("/master-subkomponens/:id", verifyUser, superadminOnly, deleteMasterSubkomponen);

export default router;