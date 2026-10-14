import Suboutputs from "../models/SuboutputModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data suboutput beserta relasinya
export const getSuboutputs = async (req, res) => {
    try {
        const response = await Suboutputs.findAll({
            include: [
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data suboutput: " + error.message });
    }
};

// 2. Ambil suboutput berdasarkan ID
export const getSuboutputById = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        res.status(200).json(suboutput);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah suboutput + OTOMATIS daftarkan kode_so ke Master Suboutputs jika belum ada
export const createSuboutput = async (req, res) => {
    try {
        const { nama_suboutput, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Validasi relasi ke tabel di atasnya (Output, Kegiatan, Program)
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

        // --- FITUR UTAMA: AUTO CREATE MASTER SUBOUTPUT ---
        await MasterSuboutputs.findOrCreate({
            where: { kode_so: kode_so },
            defaults: { kode_so: kode_so }
        });

        // Simpan data suboutput transaksi
        await Suboutputs.create({
            nama_suboutput,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ msg: "Suboutput berhasil ditambahkan dan Master Suboutput disinkronkan!" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update suboutput + Sinkronisasi Master Suboutput jika kode_so diubah
export const updateSuboutput = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({ where: { id: req.params.id } });
        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        const { nama_suboutput, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Jika kode_so diubah/diisi, pastikan masuk ke master suboutput
        if (kode_so) {
            await MasterSuboutputs.findOrCreate({
                where: { kode_so: kode_so },
                defaults: { kode_so: kode_so }
            });
        }

        await Suboutputs.update(
            {
                nama_suboutput: nama_suboutput || suboutput.nama_suboutput,
                kode_so: kode_so || suboutput.kode_so,
                kode_output: kode_output || suboutput.kode_output,
                kode_kegiatan: kode_kegiatan || suboutput.kode_kegiatan,
                kode_program: kode_program || suboutput.kode_program,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Suboutput berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus suboutput
export const deleteSuboutput = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({ where: { id: req.params.id } });
        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        await Suboutputs.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Suboutput berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};