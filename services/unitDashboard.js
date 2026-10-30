import { pengajuanScope } from './pengajuanScope.js';

export function summarizeUnitDashboard(pagus, submissions) {
    const statuses = Object.fromEntries(['draft', 'pending', 'approved', 'rejected', 'revision'].map(key => [key, { count: 0, amount: '0' }]));
    const sources = new Map();
    for (const pagu of pagus) sources.set(pagu.jenis_pagu, (sources.get(pagu.jenis_pagu) || 0n) + BigInt(pagu.nominal_pagu));
    let submitted = 0n;
    for (const record of submissions) {
        const amount = BigInt(record.total_nominal_pengajuan);
        submitted += amount;
        const status = statuses[record.status];
        if (status) { status.count++; status.amount = (BigInt(status.amount) + amount).toString(); }
    }
    return {
        saldo_pagu: [...sources.values()].reduce((sum, amount) => sum + amount, 0n).toString(),
        nominal_pengajuan: submitted.toString(), jumlah_pengajuan: submissions.length,
        statuses,
        menunggu_pimpinan: submissions.filter(record => ['pending', 'revision'].includes(record.status) && record.current_position === 'pimpinan_unit').length,
        revisi_operator: submissions.filter(record => record.status === 'revision' && record.current_position === 'operator').length,
        sources: [...sources].map(([jenis_pagu, saldo]) => ({ jenis_pagu, saldo: saldo.toString() })),
        latest: [...submissions].sort((a, b) => b.pengajuan_id - a.pengajuan_id).slice(0, 5).map(record => ({
            pengajuan_id: record.pengajuan_id, nomor_pengajuan: record.nomor_pengajuan,
            total_nominal_pengajuan: String(record.total_nominal_pengajuan), status: record.status,
            current_position: record.current_position, createdAt: record.createdAt,
        })),
    };
}

export function createUnitDashboardService({ db, units, pagus, pengajuans, inOperator }) {
    return async req => {
        if (!['operator', 'pimpinan_unit'].includes(req.role)) throw Object.assign(new Error('Dashboard unit hanya tersedia untuk Operator dan Pimpinan Unit.'), { status: 403 });
        const where = pengajuanScope(req, inOperator);
        return db.transaction(async transaction => {
            const unit = await units.findOne({ where: { kode_unit_kerja: req.kodeUnitKerja }, attributes: ['kode_unit_kerja', 'unit_kerja'], transaction });
            if (!unit) throw Object.assign(new Error('Unit kerja akun tidak ditemukan.'), { status: 404 });
            const balances = await pagus.findAll({ where: { kode_unit_kerja: req.kodeUnitKerja }, attributes: ['jenis_pagu', 'nominal_pagu'], raw: true, transaction });
            const submissions = await pengajuans.findAll({ where, attributes: ['pengajuan_id', 'nomor_pengajuan', 'total_nominal_pengajuan', 'status', 'current_position', 'createdAt'], raw: true, transaction });
            return {
                unit: { kode_unit_kerja: unit.kode_unit_kerja, unit_kerja: unit.unit_kerja },
                ...summarizeUnitDashboard(balances, submissions), updated_at: new Date().toISOString(),
            };
        });
    };
}
