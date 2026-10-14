import JenisBelanjas from "../models/JenisBelanjaModel.js";

// 1. Ambil semua data jenis belanja (Semua role bisa akses)
export const getJenisBelanjas = async (req, res) => {
    try {
        const response = await JenisBelanjas.findAll({
            order: [['kode_jenis_belanja', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data jenis belanja: " + error.message });
    }
};

// 2. Ambil data jenis belanja berdasarkan ID / kode (Semua role bisa akses)
export const getJenisBelanjaById = async (req, res) => {
    try {
        const jenisBelanja = await JenisBelanjas.findOne({
            where: { kode_jenis_belanja: req.params.id }
        });

        if (!jenisBelanja) {
            return res.status(404).json({ msg: "Data jenis belanja tidak ditemukan" });
        }

        res.status(200).json(jenisBelanja);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah jenis belanja baru (Hanya Superadmin)
export const createJenisBelanja = async (req, res) => {
    try {
        const { jenis_belanja } = req.body;

        await JenisBelanjas.create({
            jenis_belanja
        });

        res.status(201).json({ msg: "Jenis belanja berhasil ditambahkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update jenis belanja (Hanya Superadmin)
export const updateJenisBelanja = async (req, res) => {
    try {
        const jenisBelanja = await JenisBelanjas.findOne({
            where: { kode_jenis_belanja: req.params.id }
        });

        if (!jenisBelanja) {
            return res.status(404).json({ msg: "Data jenis belanja tidak ditemukan" });
        }

        const { jenis_belanja } = req.body;

        await JenisBelanjas.update(
            { jenis_belanja: jenis_belanja || jenisBelanja.jenis_belanja },
            { where: { kode_jenis_belanja: req.params.id } }
        );

        res.status(200).json({ msg: "Jenis belanja berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus jenis belanja (Hanya Superadmin)
export const deleteJenisBelanja = async (req, res) => {
    try {
        const jenisBelanja = await JenisBelanjas.findOne({
            where: { kode_jenis_belanja: req.params.id }
        });

        if (!jenisBelanja) {
            return res.status(404).json({ msg: "Data jenis belanja tidak ditemukan" });
        }

        await JenisBelanjas.destroy({
            where: { kode_jenis_belanja: req.params.id }
        });

        res.status(200).json({ msg: "Jenis belanja berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};