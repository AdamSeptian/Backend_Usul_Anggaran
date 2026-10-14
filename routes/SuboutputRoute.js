import express from "express";
import {
    getSuboutputs,
    getSuboutputById,
    createSuboutput,
    updateSuboutput,
    deleteSuboutput,
} from "../controllers/Suboutput.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/suboutputs", getSuboutputs);
router.get("/suboutputs/:id", getSuboutputById);

router.post("/suboutputs", verifyUser, superadminOnly, createSuboutput);
router.patch("/suboutputs/:id", verifyUser, superadminOnly, updateSuboutput);
router.delete("/suboutputs/:id", verifyUser, superadminOnly, deleteSuboutput);

export default router;