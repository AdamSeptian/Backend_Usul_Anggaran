import Subkomponens from "../models/SubkomponenModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
import MasterKomponens from "../models/MasterKomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data subkomponen beserta relasinya
export const getSubkomponens = async (req, res) => {
    try {
        const response = await Subkomponens.findAll({
            include: [
                { model: MasterSubkomponens, attributes: ["kode_sk"] },
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
        res.status(500).json({ msg: "Gagal mengambil data subkomponen: " + error.message });
    }
};

// 2. Ambil subkomponen berdasarkan ID
export const getSubkomponenById = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterSubkomponens },
                { model: MasterKomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        res.status(200).json(subkomponen);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah subkomponen + OTOMATIS daftarkan kode_sk ke Master Subkomponens jika belum ada
export const createSubkomponen = async (req, res) => {
    try {
        const { nama_subkomponen, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Validasi relasi hierarki di atasnya
        const komponenExists = await MasterKomponens.findOne({ where: { kode_komponen } });
        if (!komponenExists) {
            return res.status(404).json({ msg: "Kode komponen tidak ditemukan!" });
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

        // --- FITUR UTAMA: AUTO CREATE MASTER SUBKOMPONEN ---
        await MasterSubkomponens.findOrCreate({
            where: { kode_sk: kode_sk },
            defaults: { kode_sk: kode_sk }
        });

        // Simpan data transaksi subkomponen
        await Subkomponens.create({
            nama_subkomponen,
            kode_sk,
            kode_komponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ msg: "Subkomponen berhasil ditambahkan dan Master Subkomponen disinkronkan!" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update subkomponen + Sinkronisasi Master Subkomponen jika kode_sk diubah
export const updateSubkomponen = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({ where: { id: req.params.id } });
        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        const { nama_subkomponen, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Jika kode_sk diubah/diisi, pastikan masuk ke master subkomponen
        if (kode_sk) {
            await MasterSubkomponens.findOrCreate({
                where: { kode_sk: kode_sk },
                defaults: { kode_sk: kode_sk }
            });
        }

        await Subkomponens.update(
            {
                nama_subkomponen: nama_subkomponen || subkomponen.nama_subkomponen,
                kode_sk: kode_sk || subkomponen.kode_sk,
                kode_komponen: kode_komponen || subkomponen.kode_komponen,
                kode_so: kode_so || subkomponen.kode_so,
                kode_output: kode_output || subkomponen.kode_output,
                kode_kegiatan: kode_kegiatan || subkomponen.kode_kegiatan,
                kode_program: kode_program || subkomponen.kode_program,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Subkomponen berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus subkomponen
export const deleteSubkomponen = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({ where: { id: req.params.id } });
        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        await Subkomponens.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Subkomponen berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};