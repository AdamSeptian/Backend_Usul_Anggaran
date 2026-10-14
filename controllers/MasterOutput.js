import MasterOutputs from "../models/MasterOutputModel.js";

// Ambil semua master output (Semua role bisa akses)
export const getMasterOutputs = async (req, res) => {
    try {
        const response = await MasterOutputs.findAll({
            order: [['kode_output', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master output: " + error.message });
    }
};

// Ambil master output berdasarkan kode (Semua role bisa akses)
export const getMasterOutputByKode = async (req, res) => {
    try {
        const masterOutput = await MasterOutputs.findOne({
            where: { kode_output: req.params.id }
        });

        if (!masterOutput) {
            return res.status(404).json({ msg: "Master output tidak ditemukan" });
        }

        res.status(200).json(masterOutput);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Hapus master output (Hanya Superadmin)
export const deleteMasterOutput = async (req, res) => {
    try {
        const masterOutput = await MasterOutputs.findOne({
            where: { kode_output: req.params.id }
        });

        if (!masterOutput) {
            return res.status(404).json({ msg: "Master output tidak ditemukan" });
        }

        await MasterOutputs.destroy({
            where: { kode_output: req.params.id }
        });

        res.status(200).json({ msg: "Master output berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};