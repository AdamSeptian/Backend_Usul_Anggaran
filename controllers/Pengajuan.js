import Pengajuans from "./../models/PengajuanModel.js";
import Anggarans from "../models/AnggaranModel.js";
import MasterSatuans from "../models/MasterSatuanModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js";
import Operators from "../models/OperatorModel.js";
import Pagus from "../models/PaguModel.js";
import { Op } from "sequelize";
import { pengajuanScope } from "../services/pengajuanScope.js";
import Akuns from "../models/AkunModel.js";
import { createSubmitPengajuanService } from "../services/submitPengajuan.js";
import { createVerifyPengajuanService } from "../services/verifyPengajuan.js";
import { createResubmitPengajuanService } from "../services/resubmitPengajuan.js";

import JenisBelanjas from "../models/JenisBelanjaModel.js";
import Subkomponens from "../models/MasterSubkomponenModel.js";
import Suboutputs from "../models/SuboutputModel.js";
import Komponens from "../models/KomponenModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Ikus from "../models/IkuModel.js";

import { recordAudit } from "../services/auditLog.js";

const references = {
    accounts: Akuns, satuans: MasterSatuans, spendingTypes: JenisBelanjas,
    subcomponents: Subkomponens, suboutputs: Suboutputs, components: Komponens,
    activities: Kegiatans, indicators: Ikus,
};

const submitPengajuan = createSubmitPengajuanService({ db: Pengajuans.sequelize, pengajuans: Pengajuans, anggarans: Anggarans, pagus: Pagus, units: UnitKerjas, references, audit: recordAudit });
const verifySubmission = createVerifyPengajuanService(Pengajuans.sequelize, Pengajuans, recordAudit);
const resubmitSubmission = createResubmitPengajuanService({ db: Pengajuans.sequelize, pengajuans: Pengajuans, anggarans: Anggarans, pagus: Pagus, units: UnitKerjas, references, audit: recordAudit });

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
        const forReport = req.query.include === 'report-items';
        const reportWhere = pengajuanScope(req, Op.in);
        if (req.query.printable === 'kpa') {
            reportWhere.status = 'approved';
        }
        const response = await Pengajuans.findAll({
            where: reportWhere,
            include: forReport ? [...readIncludes, {
                model: Anggarans,
                attributes: ['id', 'nama_item', 'kode_akun', 'kode_sk', 'kode_iku', 'target_iku', 'total_nominal'],
                include: [{ model: JenisBelanjas, attributes: ['jenis_belanja'] }],
            }] : readIncludes,
            order: [['pengajuan_id', 'DESC']],
        });
        if (!forReport) return res.status(200).json(response);
        const itemKey = Anggarans.options.name.plural;
        res.json(response.map(record => {
            const { [itemKey]: items, ...submission } = record.toJSON();
            return { ...submission, items };
        }));
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
                { model: Akuns, attributes: ["nama_akun"] },
            ] }],
        });
        if (!record) return res.status(404).json({ msg: 'Pengajuan tidak ditemukan dalam kewenangan akun Anda.' });
        
        const payload = record.toJSON();
        const itemKey = Anggarans.options.name.plural;
        
        payload.items = (payload[itemKey] || []).map(item => ({
            ...item,
            nama_satuan: item[MasterSatuans.options.name.singular]?.nama_satuan || null,
            nama_akun: item[Akuns.options.name.singular]?.nama_akun || null,
        })).sort((a, b) => a.id - b.id);
        
        delete payload[itemKey];
        res.status(200).json(payload);
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

// 2. Buat Pengajuan Baru beserta Item Rincian Anggarannya
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
