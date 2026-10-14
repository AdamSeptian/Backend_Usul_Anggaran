import MasterPagus from "../models/MasterPaguModel.js";

// Ambil semua master pagu (Semua role bisa akses)
export const getMasterPagus = async (req, res) => {
    try {
        const response = await MasterPagus.findAll({
            order: [['jenis_pagu', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master pagu: " + error.message });
    }
};

// Ambil master pagu berdasarkan jenis_pagu (Semua role bisa akses)
export const getMasterPaguByJenis = async (req, res) => {
    try {
        const masterPagu = await MasterPagus.findOne({
            where: { jenis_pagu: req.params.id }
        });

        if (!masterPagu) {
            return res.status(404).json({ msg: "Master pagu tidak ditemukan" });
        }

        res.status(200).json(masterPagu);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Hapus master pagu (Hanya Superadmin)
export const deleteMasterPagu = async (req, res) => {
    try {
        const masterPagu = await MasterPagus.findOne({
            where: { jenis_pagu: req.params.id }
        });

        if (!masterPagu) {
            return res.status(404).json({ msg: "Master pagu tidak ditemukan" });
        }

        await MasterPagus.destroy({
            where: { jenis_pagu: req.params.id }
        });

        res.status(200).json({ msg: "Master pagu berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};