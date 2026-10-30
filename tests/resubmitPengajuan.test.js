import test from 'node:test';
import assert from 'node:assert/strict';
import { createResubmitPengajuanService } from '../services/resubmitPengajuan.js';

const stamp = '2026-10-29T01:00:00.000Z';
const req = { role: 'operator', kodeUnitKerja: 7, params: { id: '1' } };
const request = total => ({ expected_updated_at: stamp, expected_total: '80', items: [{ akun_id: '1', kode_satuan: 'PKT', volume: '1', nominal_satuan: total }] });

function fixture({ legacy = false, failed = false, invalidAccount = false, failTargetUpdate = false, targetBalance = '200', record: overrides = {} } = {}) {
    const state = {
        record: { pengajuan_id: 1, nomor_pengajuan: 'USL/1', kode_unit_kerja: 7, status: 'revision', current_position: 'operator', total_nominal_pengajuan: '80', pagu_id: legacy ? null : 11, jenis_pagu: legacy ? null : 'PNBP', updatedAt: stamp, catatan_revisi: 'Perbaiki harga', ...overrides },
        balance: '20', targetBalance, items: [{ id: 1, total_nominal: '80' }],
    };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    let queue = Promise.resolve();
    const db = { transaction(run) {
        const op = queue.then(async () => {
            const backup = structuredClone(state);
            try { return await run(transaction); }
            catch (error) { Object.assign(state, backup); throw error; }
        });
        queue = op.catch(() => {});
        return op;
    } };
    function verify(options, lock = false) { assert.equal(options.transaction, transaction); if (lock) assert.equal(options.lock, 'UPDATE'); }
    const units = { async findOne(options) { verify(options, true); return {}; } };
    const pengajuans = { async findOne(options) {
        verify(options, true);
        if (options.where.pengajuan_id !== '1') return null;
        return { ...state.record, async update(values, options) { verify(options); Object.assign(state.record, values); } };
    } };
    const pagus = { async findAll(options) {
        verify(options, true);
        if (options.where.jenis_pagu === 'RM') {
            assert.deepEqual(options.where, { kode_unit_kerja: 7, jenis_pagu: 'RM' });
            return [{ id: 22, jenis_pagu: 'RM', nominal_pagu: state.targetBalance, async update(values, options) { verify(options); state.targetBalance = values.nominal_pagu; if (failTargetUpdate) throw new Error('Pagu tujuan gagal'); } }];
        }
        if (options.where.jenis_pagu === 'pnbp') return [{ id: 11, jenis_pagu: 'PNBP', nominal_pagu: state.balance }];
        assert.deepEqual(options.where, { kode_unit_kerja: 7, id: 11, jenis_pagu: 'PNBP' });
        return [{ id: 11, jenis_pagu: 'PNBP', nominal_pagu: state.balance, async update(values, options) { verify(options); state.balance = values.nominal_pagu; } }];
    } };
    const anggarans = {
        async destroy(options) { verify(options); assert.equal(options.where.pengajuan_id, 1); state.items = []; },
        async create(values, options) { verify(options); state.items.push(values); if (failed) throw new Error('Rincian gagal'); },
    };
    const accounts = { async findOne(options) { verify(options); return invalidAccount ? null : { kode_akun: '521211', kode_sk: 'A', kode_so: '001', kode_output: 'BEI', kode_kegiatan: '7731', kode_program: 'DK' }; } };
    const satuans = { async findByPk(code, options) { verify(options); return { kode_satuan: code }; } };
    return { resubmit: createResubmitPengajuanService({ db, pengajuans, anggarans, pagus, units, accounts, satuans }), state };
}

test('revisi nominal sama tidak memotong pagu lagi dan memakai pengajuan yang sama', async () => {
    const { resubmit, state } = fixture();
    const result = await resubmit(req, request('80'));
    assert.equal(state.balance, '20');
    assert.equal(state.record.status, 'pending');
    assert.equal(state.record.current_position, 'pimpinan_unit');
    assert.equal(state.record.nomor_pengajuan, 'USL/1');
    assert.equal(state.record.catatan_revisi, 'Perbaiki harga');
    assert.equal(result.pengajuan_id, 1);
    assert.equal(state.items[0].total_nominal, '80');
});

test('naik, turun, dan tepat batas hanya menyesuaikan selisih pagu', async () => {
    for (const [total, remaining] of [['90', '10'], ['60', '40'], ['100', '0']]) {
        const { resubmit, state } = fixture();
        await resubmit(req, request(total));
        assert.equal(state.balance, remaining);
        assert.equal(state.record.total_nominal_pengajuan, total);
    }
});

test('melewati batas atau rincian gagal membatalkan seluruh perubahan', async () => {
    for (const [options, total] of [[{}, '101'], [{ failed: true }, '90'], [{ invalidAccount: true }, '90']]) {
        const { resubmit, state } = fixture(options);
        const before = structuredClone(state);
        await assert.rejects(resubmit(req, request(total)));
        assert.deepEqual(state, before);
    }
});

test('unit lain, peran salah, posisi salah, snapshot lama dan ubah identitas ditolak', async () => {
    await assert.rejects(fixture().resubmit({ ...req, role: 'superadmin' }, request('80')), error => error.status === 403);
    await assert.rejects(fixture({ record: { kode_unit_kerja: 8 } }).resubmit(req, request('80')), error => error.status === 403);
    await assert.rejects(fixture({ record: { current_position: 'pimpinan_unit' } }).resubmit(req, request('80')), error => error.status === 409);
    await assert.rejects(fixture().resubmit(req, { ...request('80'), expected_total: '1' }), error => error.status === 409);
    await assert.rejects(fixture().resubmit(req, { ...request('80'), nomor_pengajuan: 'OTHER' }), error => error.status === 400);
});

test('data lama tanpa sumber dapat diajukan ulang dengan total tetap tanpa mengubah pagu', async () => {
    const { resubmit, state } = fixture({ legacy: true });
    const result = await resubmit(req, request('80'));
    assert.equal(state.balance, '20');
    assert.equal(result.sisa_pagu, null);
    assert.equal(state.record.status, 'pending');
    await assert.rejects(fixture({ legacy: true }).resubmit(req, request('79')), error => error.status === 409);
});

test('dua pengiriman ulang bersamaan hanya berhasil sekali', async () => {
    const { resubmit, state } = fixture();
    const results = await Promise.allSettled([resubmit(req, request('90')), resubmit(req, request('90'))]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(state.balance, '10');
    assert.equal(state.items.length, 1);
});

test('pindah sumber mengembalikan nominal lama ke asal dan mengurangi total baru dari tujuan', async () => {
    const { resubmit, state } = fixture();
    await resubmit(req, { ...request('90'), jenis_pagu: 'RM' });
    assert.equal(state.balance, '100');
    assert.equal(state.targetBalance, '110');
    assert.equal(state.record.pagu_id, 22);
    assert.equal(state.record.jenis_pagu, 'RM');
});

test('saldo tujuan kurang atau update tujuan gagal membatalkan kedua saldo dan rincian', async () => {
    for (const options of [{ targetBalance: '50' }, { failTargetUpdate: true }]) {
        const { resubmit, state } = fixture(options);
        const before = structuredClone(state);
        await assert.rejects(resubmit(req, { ...request('90'), jenis_pagu: 'RM' }));
        assert.deepEqual(state, before);
    }
});

test('alias sumber yang menunjuk pagu sama tidak menyebabkan pengembalian ganda', async () => {
    const { resubmit, state } = fixture();
    await resubmit(req, { ...request('80'), jenis_pagu: 'pnbp' });
    assert.equal(state.balance, '20');
    assert.equal(state.targetBalance, '200');
    assert.equal(state.record.pagu_id, 11);
});

test('sumber asal belum tercatat tidak boleh dipindah hanya dengan memilih tujuan', async () => {
    await assert.rejects(fixture({ legacy: true }).resubmit(req, { ...request('80'), jenis_pagu: 'RM' }), error => error.status === 409);
});
