import express from "express";
import {
    getMasterPagus,
    getMasterPaguByJenis,
    deleteMasterPagu,
} from "../controllers/MasterPagu.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/master-pagus", getMasterPagus);
router.get("/master-pagus/:id", getMasterPaguByJenis);
router.delete("/master-pagus/:id", verifyUser, superadminOnly, deleteMasterPagu);

export default router;