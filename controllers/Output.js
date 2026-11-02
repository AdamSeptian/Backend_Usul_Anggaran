import Outputs from "../models/OutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";

// 1. Ambil semua data output beserta relasinya ke MasterOutputs
export const getOutputs = async (req, res) => {
    try {
        const response = await Outputs.findAll({
            include: [
                { model: MasterOutputs } // Atribut tidak dibatasi karena MasterOutputs hanya punya kode_output
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
                { model: MasterOutputs }
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

// 3. Tambah output (dengan auto-create MasterOutput jika belum ada)
export const createOutput = async (req, res) => {
    try {
        const { nama_output, kode_output } = req.body;

        // Validasi input dasar
        if (!nama_output || !kode_output) {
            return res.status(400).json({ msg: "Nama output dan kode output wajib diisi!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER OUTPUT ---
        await MasterOutputs.findOrCreate({
            where: { kode_output: kode_output },
            defaults: { kode_output: kode_output }
        });

        // Simpan data output baru
        const newOutput = await Outputs.create({
            nama_output,
            kode_output
        });

        res.status(201).json({ 
            msg: "Output berhasil ditambahkan dan Master Output disinkronkan!",
            data: newOutput
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update output
export const updateOutput = async (req, res) => {
    try {
        const output = await Outputs.findOne({ where: { id: req.params.id } });
        if (!output) {
            return res.status(404).json({ msg: "Output tidak ditemukan" });
        }

        const { nama_output, kode_output } = req.body;

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
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Output berhasil diupdate!" 
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