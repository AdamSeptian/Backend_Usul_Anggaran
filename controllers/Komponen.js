import Komponens from "../models/KomponenModel.js";
import MasterKomponens from "../models/MasterKomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data komponen beserta relasinya
export const getKomponens = async (req, res) => {
    try {
        const response = await Komponens.findAll({
            include: [
                { model: MasterKomponens, attributes: ["kode_komponen"] },
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data komponen: " + error.message });
    }
};

// 2. Ambil komponen berdasarkan ID
export const getKomponenById = async (req, res) => {
    try {
        const komponen = await Komponens.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterKomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!komponen) {
            return res.status(404).json({ msg: "Komponen tidak ditemukan" });
        }

        res.status(200).json(komponen);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah komponen + OTOMATIS daftarkan kode_komponen ke Master Komponens jika belum ada
export const createKomponen = async (req, res) => {
    try {
        const { nama_komponen, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Validasi relasi hierarki di atasnya
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

        // --- FITUR UTAMA: AUTO CREATE MASTER KOMPONEN ---
        await MasterKomponens.findOrCreate({
            where: { kode_komponen: kode_komponen },
            defaults: { kode_komponen: kode_komponen }
        });

        // Simpan data transaksi komponen
        await Komponens.create({
            nama_komponen,
            kode_komponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ msg: "Komponen berhasil ditambahkan dan Master Komponen disinkronkan!" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update komponen + Sinkronisasi Master Komponen jika kode_komponen diubah
export const updateKomponen = async (req, res) => {
    try {
        const komponen = await Komponens.findOne({ where: { id: req.params.id } });
        if (!komponen) {
            return res.status(404).json({ msg: "Komponen tidak ditemukan" });
        }

        const { nama_komponen, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Jika kode_komponen diubah/diisi, pastikan masuk ke master komponen
        if (kode_komponen) {
            await MasterKomponens.findOrCreate({
                where: { kode_komponen: kode_komponen },
                defaults: { kode_komponen: kode_komponen }
            });
        }

        await Komponens.update(
            {
                nama_komponen: nama_komponen || komponen.nama_komponen,
                kode_komponen: kode_komponen || komponen.kode_komponen,
                kode_so: kode_so || komponen.kode_so,
                kode_output: kode_output || komponen.kode_output,
                kode_kegiatan: kode_kegiatan || komponen.kode_kegiatan,
                kode_program: kode_program || komponen.kode_program,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Komponen berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus komponen
export const deleteKomponen = async (req, res) => {
    try {
        const komponen = await Komponens.findOne({ where: { id: req.params.id } });
        if (!komponen) {
            return res.status(404).json({ msg: "Komponen tidak ditemukan" });
        }

        await Komponens.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Komponen berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};