import MasterSatuans from "../models/MasterSatuanModel.js";
import { createMasterSatuanService, createDeleteSatuanService } from "../services/masterSatuan.js";
import Anggarans from "../models/AnggaranModel.js";
import db from "../config/Database.js";

const service = createMasterSatuanService(MasterSatuans);
const deleteUnusedSatuan = createDeleteSatuanService(db, MasterSatuans, Anggarans);

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
        await service.create(req.body);
        res.status(201).json({ msg: "Master satuan berhasil ditambahkan" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

export const updateMasterSatuan = async (req, res) => {
    try {
        await service.update(req.params.code, req.body);
        res.status(200).json({ msg: "Nama satuan berhasil diperbarui" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

export const deleteMasterSatuan = async (req, res) => {
    try {
        await deleteUnusedSatuan(req.params.code);
        res.status(200).json({ msg: "Satuan berhasil dihapus" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
