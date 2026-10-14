import express from "express";
import {
    getIkus,
    getIkuByKode,
    createIku,
    updateIku,
    deleteIku,
} from "../controllers/Iku.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/ikus", getIkus);
router.get("/ikus/:id", getIkuByKode);

router.post("/ikus", verifyUser, superadminOnly, createIku);
router.patch("/ikus/:id", verifyUser, superadminOnly, updateIku);
router.delete("/ikus/:id", verifyUser, superadminOnly, deleteIku);

export default router;