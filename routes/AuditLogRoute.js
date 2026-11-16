import express from "express";
import { Op } from "sequelize";
import AuditLogs from "../models/AuditLogModel.js";
import Pengajuans from "../models/PengajuanModel.js";
import { verifyUser, allowRoles } from "../middleware/AuthUser.js";
import { pengajuanScope } from "../services/pengajuanScope.js";

const router = express.Router();

router.get("/audit-logs", verifyUser, allowRoles("spi", "kpa"), async (req, res) => {
    try {
        const include = req.role === "superadmin" ? [] : [{
            model: Pengajuans, as: "pengajuan", attributes: [], required: true,
            where: pengajuanScope(req, Op.in),
        }];
        const logs = await AuditLogs.findAll({ include, order: [["id", "DESC"]], limit: 200 });
        res.json(logs);
    } catch (error) {
        res.status(error.status || 500).json({ msg: "Gagal memuat audit aktivitas." });
    }
});

export default router;
