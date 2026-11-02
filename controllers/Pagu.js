import Pagus from "../models/PaguModel.js";
import MasterPagus from "../models/MasterPaguModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js"; // Sesuaikan path jika berbeda
import { paguScope } from "../services/paguScope.js";
import { createPaguWriteService } from "../services/paguWrite.js";

const writeService = createPaguWriteService(Pagus.sequelize, Pagus, UnitKerjas, MasterPagus);

// 1. Ambil semua data pagu (Semua role bisa akses)
export const getPagus = async (req, res) => {
    try {
        const response = await Pagus.findAll({
            where: paguScope(req),
            include: [
                { model: MasterPagus, attributes: ["jenis_pagu"] },
                { model: UnitKerjas, attributes: ["kode_unit_kerja", "unit_kerja"] }
            ],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(error.status || 500).json({ msg: "Gagal mengambil data pagu: " + error.message });
    }
};

// 2. Tambah pagu + OTOMATIS daftarkan jenis_pagu ke Master Pagus jika belum ada (Hanya Superadmin)
export const getPaguByUnitKerja = async (req, res) => {
    try {
        const kode_unit_kerja = req.kodeUnitKerja; // Diambil dari middleware auth token
        if (kode_unit_kerja === null || kode_unit_kerja === undefined) return res.status(403).json({ msg: 'Akun Anda belum memiliki unit kerja. Hubungi administrator.' });

        const paguUnit = await Pagus.findAll({
            where: { kode_unit_kerja },
            include: [
                { model: MasterPagus, attributes: ["jenis_pagu"] },
                { model: UnitKerjas, attributes: ["kode_unit_kerja", "unit_kerja"] }
            ]
        });

        res.status(200).json(paguUnit);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data pagu unit kerja: " + error.message });
    }
};
// 3. Ambil pagu berdasarkan ID (Semua role bisa akses)
export const getPaguById = async (req, res) => {
    try {
        const pagu = await Pagus.findOne({
            where: paguScope(req, req.params.id),
            include: [
                { model: MasterPagus },
                { model: UnitKerjas }
            ]
        });

        if (!pagu) {
            return res.status(404).json({ msg: "Data pagu tidak ditemukan" });
        }

        res.status(200).json(pagu);
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

// Ambil pagu yang tersedia khusus untuk unit kerja yang sedang login

export const createPagu = async (req, res) => {
    try {
        await writeService.create(req.body);
        res.status(201).json({ msg: "Pagu berhasil ditambahkan" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

export const updatePagu = async (req, res) => {
    try {
        await writeService.update(req.params.id, req.body);
        res.status(200).json({ msg: "Saldo pagu berhasil diperbarui" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
// 5. Hapus pagu (Hanya Superadmin)
export const deletePagu = async (req, res) => {
    try {
        const pagu = await Pagus.findOne({ where: { id: req.params.id } });
        if (!pagu) {
            return res.status(404).json({ msg: "Data pagu tidak ditemukan" });
        }

        await Pagus.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Data pagu berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};
