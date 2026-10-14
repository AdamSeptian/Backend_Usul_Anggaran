import Operators from "../models/OperatorModel.js";
import jwt from "jsonwebtoken";

// --- HELPER UNTUK VERIFIKASI TOKEN ---
const decodeToken = (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>
    if (!token) return null;

    try {
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
};

// --- MIDDLEWARE UTAMA ---

export const verifyUser = async (req, res, next) => {
    // 1. Coba ambil data dari JWT dulu (Prioritas)
    const decoded = decodeToken(req);
   
    // 2. Jika tidak ada JWT, coba cek Session (Fallback/Cadangan)
    // Menggunakan operatorId (atau id) sebagai acuan identifikasi
    const operatorId = decoded ? decoded.id : (req.session ? req.session.operatorId : null);

    if (!operatorId) {
        return res.status(401).json({ msg: "Masukkan email dan kata sandi untuk masuk ke akun Anda." });
    }

    try {
        const operator = await Operators.findOne({
            where: { id: operatorId },
            attributes: ["id", "email", "role", "kode_unit_kerja", "nama_operator"],
        });

        if (!operator) {
            if (req.session) req.session.destroy();
            return res.status(404).json({ msg: "Operator atau pengguna tidak ditemukan." });
        }

        // Simpan data penting ke object request agar bisa dipakai controller
        req.operatorId = operator.id;
        req.email = operator.email;
        req.role = operator.role;
        req.kodeUnitKerja = operator.kode_unit_kerja;

        next();
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

export const optionalVerifyUser = async (req, res, next) => {
    req.operatorId = null;
    req.email = null;
    req.role = null;
    req.kodeUnitKerja = null;

    const decoded = decodeToken(req);
    const operatorId = decoded ? decoded.id : (req.session ? req.session.operatorId : null);

    if (!operatorId) return next();

    try {
        const operator = await Operators.findOne({
            where: { id: operatorId },
            attributes: ["id", "email", "role", "kode_unit_kerja", "nama_operator"],
        });

        if (operator) {
            req.operatorId = operator.id;
            req.email = operator.email;
            req.role = operator.role;
            req.kodeUnitKerja = operator.kode_unit_kerja;
        }
        next();
    } catch (error) {
        next();
    }
};

// --- MIDDLEWARE HAK AKSES BERDASARKAN ROLE BARU ---

// Hanya untuk Superadmin
export const superadminOnly = (req, res, next) => {
    if (req.role !== "superadmin") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Superadmin." });
    }
    next();
};

// Hanya untuk Operator Unit atau Superadmin
export const operatorUnitOnly = (req, res, next) => {
    if (req.role !== "superadmin" && req.role !== "operator_unit") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Operator Unit." });
    }
    next();
};

// Hanya untuk Pimpinan Unit atau Superadmin
export const pimpinanUnitOnly = (req, res, next) => {
    if (req.role !== "superadmin" && req.role !== "pimpinan_unit") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Pimpinan Unit." });
    }
    next();
};

// Hanya untuk Tim SAKIP atau Superadmin
export const timSakipOnly = (req, res, next) => {
    if (req.role !== "superadmin" && req.role !== "tim_sakip") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Tim SAKIP." });
    }
    next();
};

// Hanya untuk SPI atau Superadmin
export const spiOnly = (req, res, next) => {
    if (req.role !== "superadmin" && req.role !== "spi") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Satuan Pengawasan Internal (SPI)." });
    }
    next();
};

// Hanya untuk KPA atau Superadmin
export const kpaOnly = (req, res, next) => {
    if (req.role !== "superadmin" && req.role !== "kpa") {
        return res.status(403).json({ msg: "Akses terlarang! Khusus Kuasa Pengguna Anggaran (KPA)." });
    }
    next();
};

// Fleksibel: Mengizinkan beberapa role sekaligus (Contoh: untuk verifikator bertingkat)
export const allowRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.role) && req.role !== "superadmin") {
            return res.status(403).json({ msg: "Akses terlarang untuk peran Anda." });
        }
        next();
    };
};

// Middleware akses diri sendiri atau superadmin (jika mengelola data operator berdasarkan ID)
export const superadminOrSelf = (Model) => async (req, res, next) => {
    try {
        const data = await Model.findOne({ where: { id: req.params.id } });
        if (!data) return res.status(404).json({ msg: "Data tidak ditemukan" });

        if (req.role === "superadmin" || req.operatorId === data.id) {
            req.tempData = data;
            next();
        } else {
            return res.status(403).json({ msg: "Akses terlarang" });
        }
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};