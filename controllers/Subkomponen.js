import Subkomponens from "../models/SubkomponenModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";

// 1. Ambil semua data subkomponen beserta relasinya ke MasterSubkomponens
export const getSubkomponens = async (req, res) => {
    try {
        const response = await Subkomponens.findAll({
            include: [
                { model: MasterSubkomponens } // MasterSubkomponens hanya memiliki kode_sk, ambil secara utuh
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
                { model: MasterSubkomponens }
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

// 3. Tambah subkomponen (dengan auto-create MasterSubkomponens jika belum ada)
export const createSubkomponen = async (req, res) => {
    try {
        const { nama_subkomponen, kode_sk } = req.body;

        // Validasi input dasar
        if (!nama_subkomponen || !kode_sk) {
            return res.status(400).json({ msg: "Nama subkomponen dan kode subkomponen wajib diisi!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER SUBKOMPONEN ---
        await MasterSubkomponens.findOrCreate({
            where: { kode_sk: kode_sk },
            defaults: { kode_sk: kode_sk }
        });

        // Simpan data transaksi subkomponen
        const newSubkomponen = await Subkomponens.create({
            nama_subkomponen,
            kode_sk
        });

        res.status(201).json({ 
            msg: "Subkomponen berhasil ditambahkan dan Master Subkomponen disinkronkan!",
            data: newSubkomponen
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update subkomponen
export const updateSubkomponen = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({ where: { id: req.params.id } });
        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        const { nama_subkomponen, kode_sk } = req.body;
        
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
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Subkomponen berhasil diupdate!" 
        });
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