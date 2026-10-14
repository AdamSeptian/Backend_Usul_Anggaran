import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data kegiatan beserta informasi programnya (Bisa diakses semua role)
export const getKegiatans = async (req, res) => {
    try {
        const response = await Kegiatans.findAll({
            include: [{
                model: Programs,
                attributes: ["kode_program", "nama_program"]
            }],
            order: [['kode_kegiatan', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data kegiatan: " + error.message });
    }
};

// 2. Ambil data kegiatan berdasarkan kode_kegiatan (Bisa diakses semua role)
export const getKegiatanById = async (req, res) => {
    try {
        const kegiatan = await Kegiatans.findOne({
            where: {
                kode_kegiatan: req.params.id
            },
            include: [{
                model: Programs,
                attributes: ["kode_program", "nama_program"]
            }]
        });

        if (!kegiatan) {
            return res.status(404).json({ msg: "Kegiatan tidak ditemukan" });
        }

        res.status(200).json(kegiatan);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah kegiatan baru (Hanya untuk Superadmin)
export const createKegiatan = async (req, res) => {
    try {
        const { kode_kegiatan, kode_program, nama_kegiatan } = req.body;

        // Cek apakah kode kegiatan sudah terdaftar
        const existingKegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
        if (existingKegiatan) {
            return res.status(400).json({ msg: "Kode kegiatan sudah terdaftar!" });
        }

        // Pastikan program yang direferensikan benar-benar ada di database
        const programExists = await Programs.findOne({ where: { kode_program } });
        if (!programExists) {
            return res.status(404).json({ msg: "Kode program tidak ditemukan!" });
        }

        await Kegiatans.create({
            kode_kegiatan,
            kode_program,
            nama_kegiatan
        });

        res.status(201).json({ msg: "Kegiatan berhasil ditambahkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update kegiatan (Hanya untuk Superadmin)
export const updateKegiatan = async (req, res) => {
    try {
        const kegiatan = await Kegiatans.findOne({
            where: {
                kode_kegiatan: req.params.id
            }
        });

        if (!kegiatan) {
            return res.status(404).json({ msg: "Kegiatan tidak ditemukan" });
        }

        const { kode_program, nama_kegiatan } = req.body;

        // Jika kode_program diubah, pastikan program barunya valid
        if (kode_program) {
            const programExists = await Programs.findOne({ where: { kode_program } });
            if (!programExists) {
                return res.status(404).json({ msg: "Kode program tujuan tidak ditemukan!" });
            }
        }

        await Kegiatans.update(
            { 
                kode_program: kode_program || kegiatan.kode_program, 
                nama_kegiatan: nama_kegiatan || kegiatan.nama_kegiatan 
            },
            {
                where: {
                    kode_kegiatan: req.params.id
                }
            }
        );

        res.status(200).json({ msg: "Kegiatan berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus kegiatan (Hanya untuk Superadmin)
export const deleteKegiatan = async (req, res) => {
    try {
        const kegiatan = await Kegiatans.findOne({
            where: {
                kode_kegiatan: req.params.id
            }
        });

        if (!kegiatan) {
            return res.status(404).json({ msg: "Kegiatan tidak ditemukan" });
        }

        await Kegiatans.destroy({
            where: {
                kode_kegiatan: req.params.id
            }
        });

        res.status(200).json({ msg: "Kegiatan berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};