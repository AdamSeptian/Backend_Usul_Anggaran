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

// 3. Tambah output + OTOMATIS daftarkan kode_output ke Master Outputs jika belum ada
export const createOutput = async (req, res) => {
    try {
        const { nama_output, kode_output, kode_kegiatan, kode_program } = req.body;

        // Validasi relasi Kegiatan & Program
        const kegiatanExists = await Kegiatans.findOne({ where: { kode_kegiatan } });
        if (!kegiatanExists) {
            return res.status(404).json({ msg: "Kode kegiatan tidak ditemukan!" });
        }

        const programExists = await Programs.findOne({ where: { kode_program } });
        if (!programExists) {
            return res.status(404).json({ msg: "Kode program tidak ditemukan!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER OUTPUT ---
        // Jika kode_output belum ada di tabel master_output, Sequelize akan otomatis membuatnya.
        await MasterOutputs.findOrCreate({
            where: { kode_output: kode_output },
            defaults: { kode_output: kode_output }
        });

        // Simpan data output transaksi
        await Outputs.create({
            nama_output,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ msg: "Output berhasil ditambahkan dan Master Output disinkronkan!" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update output + Update Master Output jika kodenya berubah
export const updateOutput = async (req, res) => {
    try {
        const output = await Outputs.findOne({ where: { id: req.params.id } });
        if (!output) {
            return res.status(404).json({ msg: "Output tidak ditemukan" });
        }

        const { nama_output, kode_output, kode_kegiatan, kode_program } = req.body;

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
                kode_kegiatan: kode_kegiatan || output.kode_kegiatan,
                kode_program: kode_program || output.kode_program,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Output berhasil diupdate" });
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