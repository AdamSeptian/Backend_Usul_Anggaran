import UnitKerjas from "../models/UnitKerjaModel.js";
import Operators from "../models/OperatorModel.js";
import Pengajuans from "../models/PengajuanModel.js";
import Pagus from "../models/PaguModel.js";
import db from "../config/Database.js";
import { createDeleteUnitService } from "../services/deleteUnit.js";

const deleteUnusedUnit = createDeleteUnitService(db, UnitKerjas, [
    { model: Operators, label: 'operator/pengguna' },
    { model: Pengajuans, label: 'pengajuan anggaran' },
    { model: Pagus, label: 'alokasi pagu' },
]);

function unitValues(body, current) {
    const unit_kerja = typeof body.unit_kerja === 'string' ? body.unit_kerja.trim() : current?.unit_kerja;
    const kode_unit = typeof body.kode_unit === 'string' ? body.kode_unit.trim().toUpperCase() : current?.kode_unit;
    if (!unit_kerja || unit_kerja.length > 255) {
        throw Object.assign(new Error('Nama unit kerja wajib diisi, maksimal 255 karakter.'), { status: 400 });
    }
    if (!/^[A-Z]$/.test(kode_unit || '')) {
        throw Object.assign(new Error('Kode unit wajib berupa satu huruf A–Z.'), { status: 400 });
    }
    return { unit_kerja, kode_unit };
}

function sendUnitError(res, error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ msg: 'Kode unit sudah digunakan.' });
    return res.status(error.status || 500).json({ msg: error.message });
}

// 1. Ambil semua data unit kerja (Semua role / publik bisa akses untuk keperluan dropdown)
export const getUnitKerjas = async (req, res) => {
    try {
        const response = await UnitKerjas.findAll({
            order: [['kode_unit', 'ASC'], ['kode_unit_kerja', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data unit kerja: " + error.message });
    }
};

// 2. Ambil data unit kerja berdasarkan ID / kode_unit_kerja
export const getUnitKerjaById = async (req, res) => {
    try {
        const unitKerja = await UnitKerjas.findOne({
            where: { kode_unit_kerja: req.params.id }
        });

        if (!unitKerja) {
            return res.status(404).json({ msg: "Data unit kerja tidak ditemukan" });
        }

        res.status(200).json(unitKerja);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah unit kerja baru (Hanya Superadmin)
export const createUnitKerja = async (req, res) => {
    try {
        await UnitKerjas.create(unitValues(req.body));

        res.status(201).json({ msg: "Unit kerja berhasil ditambahkan" });
    } catch (error) {
        sendUnitError(res, error);
    }
};

// 4. Update unit kerja (Hanya Superadmin)
export const updateUnitKerja = async (req, res) => {
    try {
        const unitKerja = await UnitKerjas.findOne({
            where: { kode_unit_kerja: req.params.id }
        });

        if (!unitKerja) {
            return res.status(404).json({ msg: "Data unit kerja tidak ditemukan" });
        }

        await unitKerja.update(unitValues(req.body, unitKerja));

        res.status(200).json({ msg: "Unit kerja berhasil diupdate" });
    } catch (error) {
        sendUnitError(res, error);
    }
};

// 5. Hapus unit kerja (Hanya Superadmin)
export const deleteUnitKerja = async (req, res) => {
    try {
        await deleteUnusedUnit(req.params.id);
        res.status(200).json({ msg: "Unit kerja berhasil dihapus" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
