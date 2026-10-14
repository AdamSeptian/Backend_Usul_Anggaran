import MasterAkun from "../models/MasterAkunModel.js";

// Ambil semua master akun (Semua role bisa akses)
export const getMasterAkuns = async (req, res) => {
    try {
        const response = await MasterAkun.findAll({
            order: [['kode_akun', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data master akun: " + error.message });
    }
};

// Ambil master akun berdasarkan kode_akun (Semua role bisa akses)
export const getMasterAkunByKode = async (req, res) => {
    try {
        const masterAkun = await MasterAkun.findOne({
            where: { kode_akun: req.params.id }
        });

        if (!masterAkun) {
            return res.status(404).json({ msg: "Master akun tidak ditemukan" });
        }

        res.status(200).json(masterAkun);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Update nama master akun (Hanya Superadmin) - kode_akun tidak bisa diubah
export const updateMasterAkun = async (req, res) => {
    try {
        const masterAkun = await MasterAkun.findOne({ where: { kode_akun: req.params.id } });
        if (!masterAkun) {
            return res.status(404).json({ msg: "Master akun tidak ditemukan" });
        }

        const { nama_akun } = req.body;
        if (!nama_akun) {
            return res.status(400).json({ msg: "Nama akun wajib diisi!" });
        }

        await MasterAkun.update({ nama_akun }, { where: { kode_akun: req.params.id } });

        res.status(200).json({ msg: "Master akun berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// Hapus master akun (Hanya Superadmin)
export const deleteMasterAkun = async (req, res) => {
    try {
        const masterAkun = await MasterAkun.findOne({
            where: { kode_akun: req.params.id }
        });

        if (!masterAkun) {
            return res.status(404).json({ msg: "Master akun tidak ditemukan" });
        }

        await MasterAkun.destroy({
            where: { kode_akun: req.params.id }
        });

        res.status(200).json({ msg: "Master akun berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};