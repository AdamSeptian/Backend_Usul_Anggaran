import express from "express";
import {
    getOperators,
    getOperatorById,
    createOperator,
    updateOperator,
    deleteOperator,
    Login,
    Me,
    Logout,
} from "../controllers/Operator.js"; // Sesuaikan path file controllernya
import { verifyUser, superadminOnly } from "../middleware/AuthUser.js";

const router = express.Router();

// --- ROUTE AUTENTIKASI ---
router.post("/login", Login);
router.get("/me", verifyUser, Me);
router.delete("/logout", verifyUser, Logout);

// --- ROUTE MANAJEMEN OPERATOR (Khusus Superadmin) ---
router.get("/operators", verifyUser, superadminOnly, getOperators);
router.get("/operators/:id", verifyUser, superadminOnly, getOperatorById);
router.post("/operators", verifyUser, superadminOnly, createOperator);
router.patch("/operators/:id", verifyUser, superadminOnly, updateOperator);
router.delete("/operators/:id", verifyUser, superadminOnly, deleteOperator);

export default router;