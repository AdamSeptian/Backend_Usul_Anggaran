import Ikus from "../models/IkuModel.js";

// 1. Ambil semua data IKU (Semua role bisa akses)
export const getIkus = async (req, res) => {
    try {
        const response = await Ikus.findAll({
            order: [['kode_iku', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data IKU: " + error.message });
    }
};

// 2. Ambil data IKU berdasarkan kode_iku (Semua role bisa akses)
export const getIkuByKode = async (req, res) => {
    try {
        const iku = await Ikus.findOne({
            where: { kode_iku: req.params.id }
        });

        if (!iku) {
            return res.status(404).json({ msg: "Data IKU tidak ditemukan" });
        }

        res.status(200).json(iku);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah IKU baru (Hanya Superadmin)
export const createIku = async (req, res) => {
    try {
        const { kode_iku, nama_iku, target_iku } = req.body;

        const existing = await Ikus.findOne({ where: { kode_iku } });
        if (existing) {
            return res.status(400).json({ msg: "Kode IKU sudah terdaftar!" });
        }

        await Ikus.create({
            kode_iku,
            nama_iku,
            target_iku
        });

        res.status(201).json({ msg: "IKU berhasil ditambahkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update IKU (Hanya Superadmin)
export const updateIku = async (req, res) => {
    try {
        const iku = await Ikus.findOne({ where: { kode_iku: req.params.id } });
        if (!iku) {
            return res.status(404).json({ msg: "Data IKU tidak ditemukan" });
        }

        const { nama_iku, target_iku } = req.body;

        await Ikus.update(
            {
                nama_iku: nama_iku || iku.nama_iku,
                target_iku: target_iku !== undefined ? target_iku : iku.target_iku
            },
            { where: { kode_iku: req.params.id } }
        );

        res.status(200).json({ msg: "IKU berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus IKU (Hanya Superadmin)
export const deleteIku = async (req, res) => {
    try {
        const iku = await Ikus.findOne({ where: { kode_iku: req.params.id } });
        if (!iku) {
            return res.status(404).json({ msg: "Data IKU tidak ditemukan" });
        }

        await Ikus.destroy({ where: { kode_iku: req.params.id } });

        res.status(200).json({ msg: "IKU berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};