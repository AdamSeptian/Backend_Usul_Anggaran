import Outputs from "../models/OutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data output beserta relasinya
export const getOutputs = async (req, res) => {
    try {
        const response = await Outputs.findAll({
            include: [
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data output: " + error.message });
    }
};

// 2. Ambil output berdasarkan ID
export const getOutputById = async (req, res) => {
    try {
        const output = await Outputs.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!output) {
            return res.status(404).json({ msg: "Output tidak ditemukan" });
        }

        res.status(200).json(output);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah output + OTOMATIS ambil kode_program dari Kegiatan yang dipilih
export const createOutput = async (req, res) => {
    try {
        const { nama_output, kode_output, kode_kegiatan } = req.body;

        // Validasi: Cek apakah kegiatan ada di database, sekaligus ambil kode_program-nya
        const kegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
        if (!kegiatan) {
            return res.status(404).json({ msg: "Kode kegiatan tidak ditemukan!" });
        }

        // Ambil kode_program secara otomatis dari data kegiatan yang dipilih
        const kode_program = kegiatan.kode_program;

        // Berikan pesan error jika ternyata kode_program di tabel kegiatan kosong/tidak terdaftar
        if (!kode_program) {
            return res.status(400).json({ 
                msg: "Kode program pada kegiatan ini tidak ditemukan! Mohon lengkapi atau tambahkan data program pada tabel kegiatan terlebih dahulu." 
            });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER OUTPUT ---
        await MasterOutputs.findOrCreate({
            where: { kode_output: kode_output },
            defaults: { kode_output: kode_output }
        });

        // Simpan data output transaksi (kode_program otomatis terisi dari kegiatan)
        await Outputs.create({
            nama_output,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ 
            msg: "Output berhasil ditambahkan, Master Output disinkronkan, dan Kode Program terisi otomatis!",
            kode_program_otomatis: kode_program
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update output + Update otomatis kode_program jika kode_kegiatan diubah
// 4. Update output (Kode program dikunci agar otomatis dari kegiatan, kode kegiatan bisa diubah)
export const updateOutput = async (req, res) => {
    try {
        const output = await Outputs.findOne({ where: { id: req.params.id } });
        if (!output) {
            return res.status(404).json({ msg: "Output tidak ditemukan" });
        }

        const { nama_output, kode_output, kode_kegiatan, kode_program } = req.body;

        // Validasi: Jika user mencoba mengirim/mengubah kode_program secara manual lewat request
        if (kode_program) {
            return res.status(400).json({ 
                msg: "Kode program tidak dapat diubah secara manual! Kode program akan otomatis mengikuti kode kegiatan yang dipilih." 
            });
        }

        let finalKodeKegiatan = output.kode_kegiatan;
        let finalKodeProgram = output.kode_program;

        // Jika kode_kegiatan diubah oleh user, ambil otomatis kode_program yang baru dari kegiatan tersebut
        if (kode_kegiatan && kode_kegiatan !== output.kode_kegiatan) {
            const kegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
            if (!kegiatan) {
                return res.status(404).json({ msg: "Kode kegiatan tujuan tidak ditemukan!" });
            }

            finalKodeKegiatan = kode_kegiatan;
            finalKodeProgram = kegiatan.kode_program;

            if (!finalKodeProgram) {
                return res.status(400).json({ 
                    msg: "Kode program pada kegiatan baru ini kosong! Mohon periksa kembali data kegiatan." 
                });
            }
        }

        // Jika kode_output diubah, pastikan daftarkan juga ke master jika belum ada
        if (kode_output) {
            await MasterOutputs.findOrCreate({
                where: { kode_output: kode_output },
                defaults: { kode_output: kode_output }
            });
        }

        await Outputs.update(
            {
                nama_output: nama_output || output.nama_output,
                kode_output: kode_output || output.kode_output,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram, // Otomatis ikut berubah jika kegiatan berubah
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Output berhasil diupdate!",
            kode_program_terbaru: finalKodeProgram 
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus output
export const deleteOutput = async (req, res) => {
    try {
        const output = await Outputs.findOne({ where: { id: req.params.id } });
        if (!output) {
            return res.status(404).json({ msg: "Output tidak ditemukan" });
        }

        await Outputs.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Output berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};