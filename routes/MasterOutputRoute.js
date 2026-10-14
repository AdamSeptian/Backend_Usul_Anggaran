import express from "express";
import {
    getMasterOutputs,
    getMasterOutputByKode,
    deleteMasterOutput,
} from "../controllers/MasterOutput.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/master-outputs", getMasterOutputs);
router.get("/master-outputs/:id", getMasterOutputByKode);
router.delete("/master-outputs/:id", verifyUser, superadminOnly, deleteMasterOutput);

export default router;