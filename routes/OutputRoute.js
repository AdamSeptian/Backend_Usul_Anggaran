import express from "express";
import {
    getOutputs,
    getOutputById,
    createOutput,
    updateOutput,
    deleteOutput,
} from "../controllers/Output.js";
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

router.get("/outputs", getOutputs);
router.get("/outputs/:id", getOutputById);

router.post("/outputs", verifyUser, superadminOnly, createOutput);
router.patch("/outputs/:id", verifyUser, superadminOnly, updateOutput);
router.delete("/outputs/:id", verifyUser, superadminOnly, deleteOutput);

export default router;