import express from "express";
import {
    getPagus,
    getPaguById,
    createPagu,
    updatePagu,
    deletePagu,
} from "../controllers/Pagu.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/pagus", getPagus);
router.get("/pagus/:id", getPaguById);

router.post("/pagus", verifyUser, superadminOnly, createPagu);
router.patch("/pagus/:id", verifyUser, superadminOnly, updatePagu);
router.delete("/pagus/:id", verifyUser, superadminOnly, deletePagu);

export default router;