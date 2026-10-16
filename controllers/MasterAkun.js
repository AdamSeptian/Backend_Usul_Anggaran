import MasterAkun from "../models/MasterAkunModel.js";
import Akuns from "../models/AkunModel.js";
import Anggarans from "../models/AnggaranModel.js";
import db from "../config/Database.js";
import { createMasterAkunService, createDeleteAkunService } from "../services/masterAkun.js";

const service = createMasterAkunService(MasterAkun);
const removeUnused = createDeleteAkunService(db, MasterAkun, [
    { model: Akuns, label: 'hierarki akun' },
    { model: Anggarans, label: 'rincian anggaran' },
]);

export const createMasterAkun = async (req, res) => {
    try {
        await service.create(req.body);
        res.status(201).json({ msg: 'Master akun anggaran berhasil ditambahkan' });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

// Ambil semua master akun (Semua role bisa akses)
export const getMasterAkuns = async (req, res) => {
    try {
        const response = await MasterAkun.findAll({
            order: [['kode_akun', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master akun: " + error.message });
    }
};

// Ambil master akun berdasarkan kode_akun (Semua role bisa akses)
export const getMasterAkunByKode = async (req, res) => {
    try {
        const masterAkun = await MasterAkun.findOne({
            where: { kode_akun: req.params.id }
        });

        if (!masterAkun) {
            return res.status(404).json({ msg: "Master akun tidak ditemukan" });
        }

        res.status(200).json(masterAkun);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Update nama master akun (Hanya Superadmin) - kode_akun tidak bisa diubah
export const updateMasterAkun = async (req, res) => {
    try {
        await service.update(req.params.id, req.body);
        res.status(200).json({ msg: "Master akun berhasil diupdate" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

// Hapus master akun (Hanya Superadmin)
export const deleteMasterAkun = async (req, res) => {
    try {
        await removeUnused(req.params.id);
        res.status(200).json({ msg: "Master akun berhasil dihapus" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
