import Akuns from "../models/AkunModel.js";

// 1. Ambil semua data akun
export const getAkuns = async (req, res) => {
    try {
        const response = await Akuns.findAll({
            order: [['kode_akun', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data akun: " + error.message });
    }
};

// 2. Ambil akun berdasarkan kode_akun (pengganti ID)
export const getAkunById = async (req, res) => {
    try {
        const akun = await Akuns.findOne({
            where: { kode_akun: req.params.kode_akun }
        });

        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        res.status(200).json(akun);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah akun baru
export const createAkun = async (req, res) => {
    try {
        const { kode_akun, nama_akun } = req.body;

        if (!kode_akun) {
            return res.status(400).json({ msg: "Kode akun wajib diisi!" });
        }
        if (!nama_akun) {
            return res.status(400).json({ msg: "Nama akun wajib diisi!" });
        }

        // Cek duplikasi kode_akun
        const existingAkun = await Akuns.findOne({ where: { kode_akun } });
        if (existingAkun) {
            return res.status(400).json({ msg: "Akun dengan kode tersebut sudah terdaftar!" });
        }

        await Akuns.create({
            kode_akun,
            nama_akun
        });

        res.status(201).json({
            msg: "Akun berhasil ditambahkan!",
            data: { kode_akun, nama_akun }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update akun
export const updateAkun = async (req, res) => {
    try {
        const targetKodeAkun = req.params.kode_akun;
        const akun = await Akuns.findOne({ where: { kode_akun: targetKodeAkun } });
        
        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        const { kode_akun, nama_akun } = req.body;
        const finalKodeAkun = kode_akun || akun.kode_akun;
        const finalNamaAkun = nama_akun !== undefined ? nama_akun : akun.nama_akun;

        // Jika kode_akun diubah, pastikan tidak konflik dengan primary key lain
        if (kode_akun && kode_akun !== akun.kode_akun) {
            const duplicate = await Akuns.findOne({ where: { kode_akun } });
            if (duplicate) {
                return res.status(400).json({ msg: "Kode akun baru sudah digunakan oleh data lain!" });
            }
        }

        // Karena kode_akun adalah Primary Key, jika primary key berubah di Sequelize 
        // kita perlu handle update atau recreate, tapi cara paling aman adalah update kolom-kolomnya
        await Akuns.update(
            {
                kode_akun: finalKodeAkun,
                nama_akun: finalNamaAkun
            },
            { where: { kode_akun: targetKodeAkun } }
        );

        res.status(200).json({
            msg: "Akun berhasil diupdate!",
            data_terbaru: {
                kode_akun: finalKodeAkun,
                nama_akun: finalNamaAkun
            }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus akun
export const deleteAkun = async (req, res) => {
    try {
        const akun = await Akuns.findOne({ where: { kode_akun: req.params.kode_akun } });
        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        await Akuns.destroy({ where: { kode_akun: req.params.kode_akun } });

        res.status(200).json({ msg: "Data akun berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};