import Pengajuans from "./../models/PengajuanModel.js";
import Anggarans from "../models/AnggaranModel.js";
import MasterSatuans from "../models/MasterSatuanModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js";
import Operators from "../models/OperatorModel.js";
import Pagus from "../models/PaguModel.js";
import { Op } from "sequelize";
import { pengajuanScope } from "../services/pengajuanScope.js";
import MasterAkun from "../models/MasterAkunModel.js";
import Akuns from "../models/AkunModel.js";
import { createSubmitPengajuanService } from "../services/submitPengajuan.js";
import { createVerifyPengajuanService } from "../services/verifyPengajuan.js";
import { createResubmitPengajuanService } from "../services/resubmitPengajuan.js";

const submitPengajuan = createSubmitPengajuanService({ db: Pengajuans.sequelize, pengajuans: Pengajuans, anggarans: Anggarans, pagus: Pagus, units: UnitKerjas, accounts: Akuns, satuans: MasterSatuans });
const verifySubmission = createVerifyPengajuanService(Pengajuans.sequelize, Pengajuans);
const resubmitSubmission = createResubmitPengajuanService({ db: Pengajuans.sequelize, pengajuans: Pengajuans, anggarans: Anggarans, pagus: Pagus, units: UnitKerjas, accounts: Akuns, satuans: MasterSatuans });

export const resubmitPengajuan = async (req, res) => {
    try { res.status(200).json(await resubmitSubmission(req, req.body)); }
    catch (error) { res.status(error.status || 500).json({ msg: error.message }); }
};

const readIncludes = [
    { model: UnitKerjas, attributes: ["kode_unit_kerja", "unit_kerja"] },
    { model: Operators, attributes: ["nama_operator", "email"] },
];

export const getPengajuans = async (req, res) => {
    try {
        const response = await Pengajuans.findAll({
            where: pengajuanScope(req, Op.in),
            include: readIncludes,
            order: [['pengajuan_id', 'DESC']],
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

export const getPengajuanById = async (req, res) => {
    try {
        const record = await Pengajuans.findOne({
            where: pengajuanScope(req, Op.in, req.params.id),
            include: [...readIncludes, { model: Anggarans, include: [
                { model: MasterSatuans, attributes: ["nama_satuan"] },
                { model: MasterAkun, attributes: ["nama_akun"] },
            ] }],
        });
        if (!record) return res.status(404).json({ msg: 'Pengajuan tidak ditemukan dalam kewenangan akun Anda.' });
        const payload = record.toJSON();
        const itemKey = Anggarans.options.name.plural;
        payload.items = (payload[itemKey] || []).map(item => ({
            ...item,
            nama_satuan: item[MasterSatuans.options.name.singular]?.nama_satuan || null,
            nama_akun: item[MasterAkun.options.name.singular]?.nama_akun || null,
        })).sort((a, b) => a.id - b.id);
        delete payload[itemKey];
        res.status(200).json(payload);
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
// 2. Buat Pengajuan Baru beserta Item Rincian Anggarannya (Dengan Validasi Pagu & Rekap Total)
export const createPengajuan = async (req, res) => {
    try {
        const result = await submitPengajuan(req, req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
// 3. Alur Verifikasi Bertingkat
export const verifyPengajuan = async (req, res) => {
    try {
        res.status(200).json(await verifySubmission(req, req.body));
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};
