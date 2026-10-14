import UnitKerjas from "../models/UnitKerjaModel.js";

// 1. Ambil semua data unit kerja (Semua role / publik bisa akses untuk keperluan dropdown)
export const getUnitKerjas = async (req, res) => {
    try {
        const response = await UnitKerjas.findAll({
            order: [['kode_unit_kerja', 'ASC']]
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
        const { unit_kerja } = req.body;

        await UnitKerjas.create({
            unit_kerja
        });

        res.status(201).json({ msg: "Unit kerja berhasil ditambahkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
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

        const { unit_kerja } = req.body;

        await UnitKerjas.update(
            { unit_kerja: unit_kerja || unitKerja.unit_kerja },
            { where: { kode_unit_kerja: req.params.id } }
        );

        res.status(200).json({ msg: "Unit kerja berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus unit kerja (Hanya Superadmin)
export const deleteUnitKerja = async (req, res) => {
    try {
        const unitKerja = await UnitKerjas.findOne({
            where: { kode_unit_kerja: req.params.id }
        });

        if (!unitKerja) {
            return res.status(404).json({ msg: "Data unit kerja tidak ditemukan" });
        }

        await UnitKerjas.destroy({
            where: { kode_unit_kerja: req.params.id }
        });

        res.status(200).json({ msg: "Unit kerja berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};