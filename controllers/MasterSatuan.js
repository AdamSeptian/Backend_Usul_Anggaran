import MasterSatuans from "../models/MasterSatuanModel.js";

export const getMasterSatuans = async (req, res) => {
    try {
        const response = await MasterSatuans.findAll({ order: [['kode_satuan', 'ASC']] });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

export const createMasterSatuan = async (req, res) => {
    try {
        const { kode_satuan, nama_satuan } = req.body;
        await MasterSatuans.findOrCreate({
            where: { kode_satuan },
            defaults: { nama_satuan }
        });
        res.status(201).json({ msg: "Master satuan berhasil disinkronkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};