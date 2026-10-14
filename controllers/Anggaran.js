import Anggarans from "../models/AnggaranModel.js";
import Pengajuans from "../models/PengajuanModel.js";
import MasterSatuans from "../models/MasterSatuanModel.js";
import MasterAkun from "../models/MasterAkunModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// 1. Ambil semua rincian anggaran (Bisa difilter berdasarkan pengajuan_id via query params jika diperlukan)
export const getAnggarans = async (req, res) => {
    try {
        const { pengajuan_id } = req.query;
        let condition = {};
        if (pengajuan_id) {
            condition = { pengajuan_id };
        }

        const response = await Anggarans.findAll({
            where: condition,
            include: [
                { model: Pengajuans, attributes: ["nomor_pengajuan", "status", "current_position"] },
                { model: MasterSatuans, attributes: ["kode_satuan", "nama_satuan"] },
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
        res.status(500).json({ msg: "Gagal mengambil data rincian anggaran: " + error.message });
    }
};

// 2. Ambil rincian anggaran berdasarkan ID item
export const getAnggaranById = async (req, res) => {
    try {
        const anggaran = await Anggarans.findOne({
            where: { id: req.params.id },
            include: [
                { model: Pengajuans },
                { model: MasterSatuans },
                { model: MasterAkun },
                { model: MasterSubkomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!anggaran) {
            return res.status(404).json({ msg: "Item rincian anggaran tidak ditemukan" });
        }

        res.status(200).json(anggaran);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah rincian item anggaran baru ke suatu pengajuan (Biasanya oleh operator unit)
export const createAnggaranItem = async (req, res) => {
    try {
        const {
            pengajuan_id,
            volume,
            kode_satuan,
            nama_satuan, // Opsional jika ingin auto-create master satuan
            nominal_satuan,
            kode_akun,
            kode_sk,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        } = req.body;

        // Pastikan pengajuan ada dan statusnya masih memungkinkan diedit (misal: draft / revision)
        const pengajuan = await Pengajuans.findOne({ where: { pengajuan_id } });
        if (!pengajuan) {
            return res.status(404).json({ msg: "Nomor pengajuan induk tidak ditemukan!" });
        }

        if (pengajuan.status !== 'draft' && pengajuan.status !== 'revision') {
            return res.status(403).json({ msg: "Pengajuan sudah diproses atau disetujui, item anggaran tidak dapat ditambahkan." });
        }

        // Auto-create Master Satuan jika belum ada
        if (kode_satuan) {
            await MasterSatuans.findOrCreate({
                where: { kode_satuan },
                defaults: { nama_satuan: nama_satuan || kode_satuan }
            });
        }

        // Hitung total nominal otomatis
        const total_nominal = Number(volume) * Number(nominal_satuan);

        const newAnggaran = await Anggarans.create({
            pengajuan_id,
            volume,
            kode_satuan,
            nominal_satuan,
            total_nominal,
            kode_akun,
            kode_sk,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ msg: "Item rincian anggaran berhasil ditambahkan", data: newAnggaran });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update rincian item anggaran
export const updateAnggaranItem = async (req, res) => {
    try {
        const anggaran = await Anggarans.findOne({
            where: { id: req.params.id },
            include: [{ model: Pengajuans }]
        });

        if (!anggaran) {
            return res.status(404).json({ msg: "Item rincian anggaran tidak ditemukan" });
        }

        // Validasi status pengajuan induk
        if (anggaran.pengajuan.status !== 'draft' && anggaran.pengajuan.status !== 'revision') {
            return res.status(403).json({ msg: "Pengajuan sedang berjalan atau selesai, item tidak dapat diubah." });
        }

        const {
            volume,
            kode_satuan,
            nama_satuan,
            nominal_satuan,
            kode_akun,
            kode_sk,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        } = req.body;

        if (kode_satuan) {
            await MasterSatuans.findOrCreate({
                where: { kode_satuan },
                defaults: { nama_satuan: nama_satuan || kode_satuan }
            });
        }

        const vol = volume !== undefined ? volume : anggaran.volume;
        const nom = nominal_satuan !== undefined ? nominal_satuan : anggaran.nominal_satuan;
        const total_nominal = Number(vol) * Number(nom);

        await Anggarans.update(
            {
                volume: vol,
                kode_satuan: kode_satuan || anggaran.kode_satuan,
                nominal_satuan: nom,
                total_nominal,
                kode_akun: kode_akun || anggaran.kode_akun,
                kode_sk: kode_sk || anggaran.kode_sk,
                kode_so: kode_so || anggaran.kode_so,
                kode_output: kode_output || anggaran.kode_output,
                kode_kegiatan: kode_kegiatan || anggaran.kode_kegiatan,
                kode_program: kode_program || anggaran.kode_program,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Item rincian anggaran berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus rincian item anggaran
export const deleteAnggaranItem = async (req, res) => {
    try {
        const anggaran = await Anggarans.findOne({
            where: { id: req.params.id },
            include: [{ model: Pengajuans }]
        });

        if (!anggaran) {
            return res.status(404).json({ msg: "Item rincian anggaran tidak ditemukan" });
        }

        if (anggaran.pengajuan.status !== 'draft' && anggaran.pengajuan.status !== 'revision') {
            return res.status(403).json({ msg: "Pengajuan sudah diproses, item anggaran tidak dapat dihapus." });
        }

        await Anggarans.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Item rincian anggaran berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};