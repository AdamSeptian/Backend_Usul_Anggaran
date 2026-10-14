import express from "express";
import {
    getMasterSuboutputs,
    getMasterSuboutputByKode,
    deleteMasterSuboutput,
} from "../controllers/MasterSuboutput.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/master-suboutputs", getMasterSuboutputs);
router.get("/master-suboutputs/:id", getMasterSuboutputByKode);
router.delete("/master-suboutputs/:id", verifyUser, superadminOnly, deleteMasterSuboutput);

export default router;