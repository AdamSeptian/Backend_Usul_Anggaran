import MasterSuboutputs from "../models/MasterSuboutputModel.js";

// Ambil semua master suboutput (Semua role bisa akses)
export const getMasterSuboutputs = async (req, res) => {
    try {
        const response = await MasterSuboutputs.findAll({
            order: [['kode_so', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master suboutput: " + error.message });
    }
};

// Ambil master suboutput berdasarkan kode_so (Semua role bisa akses)
export const getMasterSuboutputByKode = async (req, res) => {
    try {
        const masterSuboutput = await MasterSuboutputs.findOne({
            where: { kode_so: req.params.id }
        });

        if (!masterSuboutput) {
            return res.status(404).json({ msg: "Master suboutput tidak ditemukan" });
        }

        res.status(200).json(masterSuboutput);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Hapus master suboutput (Hanya Superadmin)
export const deleteMasterSuboutput = async (req, res) => {
    try {
        const masterSuboutput = await MasterSuboutputs.findOne({
            where: { kode_so: req.params.id }
        });

        if (!masterSuboutput) {
            return res.status(404).json({ msg: "Master suboutput tidak ditemukan" });
        }

        await MasterSuboutputs.destroy({
            where: { kode_so: req.params.id }
        });

        res.status(200).json({ msg: "Master suboutput berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};