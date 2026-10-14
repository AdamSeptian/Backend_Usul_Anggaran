import express from "express";
import {
    getMasterKomponens,
    getMasterKomponenByKode,
    deleteMasterKomponen,
} from "../controllers/MasterKomponen.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/master-komponens", getMasterKomponens);
router.get("/master-komponens/:id", getMasterKomponenByKode);
router.delete("/master-komponens/:id", verifyUser, superadminOnly, deleteMasterKomponen);

export default router;