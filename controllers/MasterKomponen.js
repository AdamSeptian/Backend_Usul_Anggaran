import MasterKomponens from "../models/MasterKomponenModel.js";

// Ambil semua master komponen (Semua role bisa akses)
export const getMasterKomponens = async (req, res) => {
    try {
        const response = await MasterKomponens.findAll({
            order: [['kode_komponen', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master komponen: " + error.message });
    }
};

// Ambil master komponen berdasarkan kode_komponen (Semua role bisa akses)
export const getMasterKomponenByKode = async (req, res) => {
    try {
        const masterKomponen = await MasterKomponens.findOne({
            where: { kode_komponen: req.params.id }
        });

        if (!masterKomponen) {
            return res.status(404).json({ msg: "Master komponen tidak ditemukan" });
        }

        res.status(200).json(masterKomponen);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Hapus master komponen (Hanya Superadmin)
export const deleteMasterKomponen = async (req, res) => {
    try {
        const masterKomponen = await MasterKomponens.findOne({
            where: { kode_komponen: req.params.id }
        });

        if (!masterKomponen) {
            return res.status(404).json({ msg: "Master komponen tidak ditemukan" });
        }

        await MasterKomponens.destroy({
            where: { kode_komponen: req.params.id }
        });

        res.status(200).json({ msg: "Master komponen berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};