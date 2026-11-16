import { calculateSubmissionItems, resolveSubmissionItems, submissionFundingSource } from './submitPengajuan.js';
function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createResubmitPengajuanService({ db, pengajuans, anggarans, pagus, units, references, audit }) {
    return async (req, body = {}) => {
        if (req.role !== 'operator' || req.kodeUnitKerja == null) fail(403, 'Perbaikan hanya tersedia untuk Operator Unit.');
        const { calculated, total } = calculateSubmissionItems(body.items);
        const source = submissionFundingSource(calculated, body.jenis_pagu);
        return db.transaction(async transaction => {
            const unit = await units.findOne({ where: { kode_unit_kerja: req.kodeUnitKerja }, transaction, lock: transaction.LOCK.UPDATE });
            if (!unit) fail(404, 'Unit kerja akun tidak ditemukan.');
            const record = await pengajuans.findOne({ where: { pengajuan_id: req.params.id }, transaction, lock: transaction.LOCK.UPDATE });
            if (!record) fail(404, 'Pengajuan tidak ditemukan.');
            if (String(record.kode_unit_kerja) !== String(req.kodeUnitKerja)) fail(403, 'Pengajuan bukan milik unit akun Anda.');
            if (record.status !== 'revision' || record.current_position !== 'operator') fail(409, 'Pengajuan tidak lagi berada pada tahap perbaikan Operator. Muat ulang.');
            if (!body.expected_updated_at || new Date(body.expected_updated_at).getTime() !== new Date(record.updatedAt).getTime() || String(body.expected_total) !== String(record.total_nominal_pengajuan)) fail(409, 'Data pengajuan berubah. Muat ulang formulir sebelum mengajukan ulang.');
            if (body.nomor_pengajuan !== undefined && body.nomor_pengajuan !== record.nomor_pengajuan) fail(400, 'Nomor pengajuan revisi tidak dapat diubah.');
            const oldTotal = BigInt(record.total_nominal_pengajuan);
            let balance = null, targetBalance = null, newBalance = null, returnedBalance = null;
            if (record.pagu_id != null || record.jenis_pagu) {
                const where = { kode_unit_kerja: req.kodeUnitKerja };
                if (record.pagu_id != null) where.id = record.pagu_id;
                if (record.jenis_pagu) where.jenis_pagu = record.jenis_pagu;
                const found = await pagus.findAll({ where, transaction, lock: transaction.LOCK.UPDATE });
                if (found.length !== 1) fail(409, 'Pagu asal pengajuan tidak tersedia atau ganda. Hubungi Admin.');
                balance = found[0];
                targetBalance = balance;
                if (source !== balance.jenis_pagu) {
                    const targets = await pagus.findAll({ where: { kode_unit_kerja: req.kodeUnitKerja, jenis_pagu: source }, transaction, lock: transaction.LOCK.UPDATE });
                    if (targets.length !== 1) fail(409, 'Pagu sumber dana tujuan belum tersedia atau ganda pada unit Anda.');
                    if (String(targets[0].id) !== String(balance.id)) {
                        targetBalance = targets[0];
                        returnedBalance = BigInt(balance.nominal_pagu) + oldTotal;
                        if (returnedBalance > 9223372036854775807n) fail(400, 'Saldo pagu asal setelah pengembalian melebihi batas penyimpanan.');
                    }
                }
                const available = BigInt(targetBalance.nominal_pagu) + (returnedBalance === null ? oldTotal : 0n);
                if (total > available) fail(409, `Total revisi melebihi batas pagu Rp ${available.toLocaleString('id-ID')}. Kurangi rincian atau muat ulang.`);
                newBalance = available - total;
                if (newBalance < 0n || newBalance > 9223372036854775807n) fail(400, 'Saldo setelah revisi di luar batas penyimpanan.');
            } else {
                if (body.jenis_pagu !== undefined) fail(409, 'Sumber dana asal pengajuan lama belum tercatat. Pastikan sumber asal terlebih dahulu sebelum memindahkan pagu.');
                if (total !== oldTotal) fail(409, 'Sumber pagu pengajuan lama belum tercatat. Total revisi harus tetap sama; hubungi Admin untuk memastikan sumber dana sebelum mengubah total.');
            }
            const processed = await resolveSubmissionItems(calculated, references, transaction);
            await anggarans.destroy({ where: { pengajuan_id: record.pengajuan_id }, transaction });
            for (const item of processed) await anggarans.create({ ...item, pengajuan_id: record.pengajuan_id }, { transaction });
            if (returnedBalance !== null) await balance.update({ nominal_pagu: returnedBalance.toString() }, { transaction });
            if (targetBalance) await targetBalance.update({ nominal_pagu: newBalance.toString() }, { transaction });
            await record.update({
                total_nominal_pengajuan: total.toString(), status: 'pending', current_position: 'pimpinan_unit',
                ...(targetBalance ? { pagu_id: targetBalance.id, jenis_pagu: targetBalance.jenis_pagu } : {}),
            }, { transaction });
            await audit?.(req, {
                module: 'Pengajuan', action: 'AJUKAN ULANG', target: record.nomor_pengajuan,
                pengajuan_id: record.pengajuan_id, before: 'operator', after: 'pimpinan_unit',
                note: 'Total: Rp ' + total.toLocaleString('id-ID'),
            }, transaction);
            return { msg: 'Perbaikan tersimpan dan pengajuan dikirim ulang ke Pimpinan Unit.', pengajuan_id: record.pengajuan_id, total_nominal_diajukan: total.toString(), sisa_pagu: newBalance === null ? null : newBalance.toString() };
        });
    };
}
