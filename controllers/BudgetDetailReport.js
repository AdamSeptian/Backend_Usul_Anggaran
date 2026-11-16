import Pengajuans from "../models/PengajuanModel.js";
import Anggarans from "../models/AnggaranModel.js";
import Units from "../models/UnitKerjaModel.js";
import Accounts from "../models/AkunModel.js";
import Programs from "../models/ProgramModel.js";
import Activities from "../models/KegiatanModel.js";
import Outputs from "../models/OutputModel.js";
import Suboutputs from "../models/SuboutputModel.js";
import Components from "../models/KomponenModel.js";
import Subcomponents from "../models/SubkomponenModel.js";

const crossUnitRoles = new Set(["superadmin", "tim_sakip", "spi", "kpa"]);
const unitRoles = new Set(["operator", "pimpinan_unit"]);

export function budgetDetailScope(role, sessionUnit, requestedUnit) {
    if (!crossUnitRoles.has(role)) {
        if (!unitRoles.has(role) || sessionUnit == null) {
            throw Object.assign(new Error("Akun tidak memiliki akses laporan anggaran."), { status: 403 });
        }
        if (requestedUnit !== undefined && String(sessionUnit) !== requestedUnit) {
            throw Object.assign(new Error("Laporan hanya tersedia untuk unit kerja akun Anda."), { status: 403 });
        }
        return sessionUnit;
    }
    if (requestedUnit === undefined) return null;
    if (typeof requestedUnit !== "string" || !/^[1-9]\d{0,9}$/.test(requestedUnit) || Number(requestedUnit) > 2147483647) {
        throw Object.assign(new Error("Unit kerja tidak valid."), { status: 400 });
    }
    return Number(requestedUnit);
}

const masterSources = [
    ["program", Programs, ["kode_program", "nama_program"]],
    ["kegiatan", Activities, ["kode_kegiatan", "nama_kegiatan"]],
    ["output", Outputs, ["kode_output", "nama_output"]],
    ["suboutput", Suboutputs, ["kode_kegiatan", "kode_output", "kode_so", "nama_suboutput"]],
    ["komponen", Components, ["kode_kegiatan", "kode_output", "kode_so", "kode_komponen", "nama_komponen"]],
    ["sk", Subcomponents, ["kode_sk", "nama_subkomponen"]],
    ["akun", Accounts, ["kode_akun", "nama_akun"]],
];

export async function getBudgetDetailReport(req, res) {
    try {
        const unit = budgetDetailScope(req.role, req.kodeUnitKerja, req.query.unit);
        const where = unit === null ? {} : { kode_unit_kerja: unit };
        const result = await Pengajuans.sequelize.transaction(async transaction => {
            const units = await Units.findAll({
                where, attributes: ["kode_unit_kerja", "unit_kerja"], order: [["unit_kerja", "ASC"]], transaction,
            });
            if (unit !== null && !units.length) throw Object.assign(new Error("Unit kerja tidak ditemukan."), { status: 404 });
            const submissions = await Pengajuans.findAll({
                where,
                attributes: ["pengajuan_id", "nomor_pengajuan", "kode_unit_kerja", "jenis_pagu", "status"],
                include: [{
                    model: Anggarans,
                    attributes: ["id", "nama_item", "kode_program", "kode_kegiatan", "kode_output", "kode_so",
                        "kode_komponen", "kode_sk", "kode_akun", "kode_satuan", "volume", "nominal_satuan", "total_nominal"],
                }],
                order: [["pengajuan_id", "ASC"], [Anggarans, "id", "ASC"]],
                transaction,
            });
            const names = {};
            for (const [key, model, attributes] of masterSources) {
                names[key] = await model.findAll({ attributes, raw: true, transaction });
            }
            return { units, submissions: submissions.map(record => {
                const { [Anggarans.options.name.plural]: items, ...submission } = record.toJSON();
                return { ...submission, items };
            }), names };
        });
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.status ? error.message : "Gagal memuat laporan detail anggaran." });
    }
}
