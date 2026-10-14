import Pagus from "../models/PaguModel.js";
import MasterPagus from "../models/MasterPaguModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js"; // Sesuaikan path jika berbeda

// 1. Ambil semua data pagu (Semua role bisa akses)
export const getPagus = async (req, res) => {
    try {
        const response = await Pagus.findAll({
            include: [
                { model: MasterPagus, attributes: ["jenis_pagu"] },
                { model: UnitKerjas, attributes: ["kode_unit_kerja", "nama_unit_kerja"] }
            ],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data pagu: " + error.message });
    }
};

// 2. Ambil pagu berdasarkan ID (Semua role bisa akses)
export const getPaguById = async (req, res) => {
    try {
        const pagu = await Pagus.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterPagus },
                { model: UnitKerjas }
            ]
        });

        if (!pagu) {
            return res.status(404).json({ msg: "Data pagu tidak ditemukan" });
        }

        res.status(200).json(pagu);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah pagu + OTOMATIS daftarkan jenis_pagu ke Master Pagus jika belum ada (Hanya Superadmin)
export const createPagu = async (req, res) => {
    try {
        const { jenis_pagu, nominal_pagu, kode_unit_kerja } = req.body;

        // Validasi apakah unit kerja terdaftar
        const unitExists = await UnitKerjas.findOne({ where: { kode_unit_kerja } });
        if (!unitExists) {
            return res.status(404).json({ msg: "Unit kerja tidak ditemukan!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER PAGU ---
        await MasterPagus.findOrCreate({
            where: { jenis_pagu: jenis_pagu },
            defaults: { jenis_pagu: jenis_pagu }
        });

        // Simpan data transaksi pagu
        await Pagus.create({
            jenis_pagu,
            nominal_pagu,
            kode_unit_kerja
        });

        res.status(201).json({ msg: "Data pagu berhasil ditambahkan dan Master Pagu disinkronkan!" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update pagu + Sinkronisasi Master Pagu jika jenis_pagu diubah (Hanya Superadmin)
export const updatePagu = async (req, res) => {
    try {
        const pagu = await Pagus.findOne({ where: { id: req.params.id } });
        if (!pagu) {
            return res.status(404).json({ msg: "Data pagu tidak ditemukan" });
        }

        const { jenis_pagu, nominal_pagu, kode_unit_kerja } = req.body;

        if (jenis_pagu) {
            await MasterPagus.findOrCreate({
                where: { jenis_pagu: jenis_pagu },
                defaults: { jenis_pagu: jenis_pagu }
            });
        }

        if (kode_unit_kerja) {
            const unitExists = await UnitKerjas.findOne({ where: { kode_unit_kerja } });
            if (!unitExists) {
                return res.status(404).json({ msg: "Unit kerja tujuan tidak ditemukan!" });
            }
        }

        await Pagus.update(
            {
                jenis_pagu: jenis_pagu || pagu.jenis_pagu,
                nominal_pagu: nominal_pagu || pagu.nominal_pagu,
                kode_unit_kerja: kode_unit_kerja || pagu.kode_unit_kerja,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Data pagu berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus pagu (Hanya Superadmin)
export const deletePagu = async (req, res) => {
    try {
        const pagu = await Pagus.findOne({ where: { id: req.params.id } });
        if (!pagu) {
            return res.status(404).json({ msg: "Data pagu tidak ditemukan" });
        }

        await Pagus.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Data pagu berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};