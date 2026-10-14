import Akuns from "../models/AkunModel.js";
import MasterAkun from "../models/MasterAkunModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data akun transaksi beserta relasinya
export const getAkuns = async (req, res) => {
    try {
        const response = await Akuns.findAll({
            include: [
                { model: MasterAkun, attributes: ["kode_akun", "nama_akun"] },
                { model: MasterSubkomponens, attributes: ["kode_sk"] },
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data akun: " + error.message });
    }
};

// 2. Ambil akun berdasarkan ID
export const getAkunById = async (req, res) => {
    try {
        const akun = await Akuns.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterAkun },
                { model: MasterSubkomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        res.status(200).json(akun);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah akun + OTOMATIS daftarkan kode_akun ke MasterAkun jika belum ada
export const createAkun = async (req, res) => {
    try {
        const { kode_akun, nama_akun, kode_sk, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Validasi relasi hierarki di atasnya
        const skExists = await MasterSubkomponens.findOne({ where: { kode_sk } });
        if (!skExists) {
            return res.status(404).json({ msg: "Kode subkomponen tidak ditemukan!" });
        }

        const soExists = await MasterSuboutputs.findOne({ where: { kode_so } });
        if (!soExists) {
            return res.status(404).json({ msg: "Kode suboutput tidak ditemukan!" });
        }

        const outputExists = await MasterOutputs.findOne({ where: { kode_output } });
        if (!outputExists) {
            return res.status(404).json({ msg: "Kode output tidak ditemukan!" });
        }

        const kegiatanExists = await Kegiatans.findOne({ where: { kode_kegiatan } });
        if (!kegiatanExists) {
            return res.status(404).json({ msg: "Kode kegiatan tidak ditemukan!" });
        }

        const programExists = await Programs.findOne({ where: { kode_program } });
        if (!programExists) {
            return res.status(404).json({ msg: "Kode program tidak ditemukan!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER AKUN ---
        await MasterAkun.findOrCreate({
            where: { kode_akun: kode_akun },
            defaults: { 
                kode_akun: kode_akun, 
                nama_akun: nama_akun || "Akun " + kode_akun 
            }
        });

        // Simpan data transaksi akun
        await Akuns.create({
            kode_akun,
            kode_sk,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ msg: "Akun berhasil ditambahkan dan Master Akun disinkronkan!" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update akun + Sinkronisasi Master Akun jika kode_akun diubah
export const updateAkun = async (req, res) => {
    try {
        const akun = await Akuns.findOne({ where: { id: req.params.id } });
        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        const { kode_akun, nama_akun, kode_sk, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        if (kode_akun) {
            await MasterAkun.findOrCreate({
                where: { kode_akun: kode_akun },
                defaults: { 
                    kode_akun: kode_akun, 
                    nama_akun: nama_akun || "Akun " + kode_akun 
                }
            });
        }

        await Akuns.update(
            {
                kode_akun: kode_akun || akun.kode_akun,
                kode_sk: kode_sk || akun.kode_sk,
                kode_so: kode_so || akun.kode_so,
                kode_output: kode_output || akun.kode_output,
                kode_kegiatan: kode_kegiatan || akun.kode_kegiatan,
                kode_program: kode_program || akun.kode_program,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Data akun berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus akun
export const deleteAkun = async (req, res) => {
    try {
        const akun = await Akuns.findOne({ where: { id: req.params.id } });
        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        await Akuns.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Data akun berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};