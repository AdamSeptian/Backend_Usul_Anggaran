import MasterSubkomponens from "../models/MasterSubkomponenModel.js";

// Ambil semua master subkomponen (Semua role bisa akses)
export const getMasterSubkomponens = async (req, res) => {
    try {
        const response = await MasterSubkomponens.findAll({
            order: [['kode_sk', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master subkomponen: " + error.message });
    }
};

// Ambil master subkomponen berdasarkan kode_sk (Semua role bisa akses)
export const getMasterSubkomponenByKode = async (req, res) => {
    try {
        const masterSubkomponen = await MasterSubkomponens.findOne({
            where: { kode_sk: req.params.id }
        });

        if (!masterSubkomponen) {
            return res.status(404).json({ msg: "Master subkomponen tidak ditemukan" });
        }

        res.status(200).json(masterSubkomponen);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Hapus master subkomponen (Hanya Superadmin)
export const deleteMasterSubkomponen = async (req, res) => {
    try {
        const masterSubkomponen = await MasterSubkomponens.findOne({
            where: { kode_sk: req.params.id }
        });

        if (!masterSubkomponen) {
            return res.status(404).json({ msg: "Master subkomponen tidak ditemukan" });
        }

        await MasterSubkomponens.destroy({
            where: { kode_sk: req.params.id }
        });

        res.status(200).json({ msg: "Master subkomponen berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};