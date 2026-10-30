import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmitPengajuanService } from '../services/submitPengajuan.js';

const actor = { role: 'operator', operatorId: 2, kodeUnitKerja: 7 };
const hierarchy = { id: 1, kode_akun: '521211', kode_sk: 'A', kode_komponen: '004', kode_so: '001', kode_output: 'BEI', kode_kegiatan: '7731', kode_program: 'DK' };
const body = (nomor = 'USL/1', price = '40') => ({ nomor_pengajuan: nomor, jenis_pagu: 'PNBP', items: [{ akun_id: '1', volume: '2', nominal_satuan: price, kode_satuan: 'PKT', total_nominal: '1' }] });

function fixture({ balance = '100', failItem = false, duplicatePagu = false, invalidAccount = false, invalidSatuan = false, missingPagu = false } = {}) {
    const state = { balance, submissions: [], items: [] };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    let queue = Promise.resolve();
    const db = { transaction(run) {
        const next = queue.then(async () => {
            const backup = structuredClone(state);
            try { return await run(transaction); }
            catch (error) { Object.assign(state, backup); throw error; }
        });
        queue = next.catch(() => {});
        return next;
    } };
    const verify = options => assert.equal(options.transaction, transaction);
    const pengajuans = {
        async findOne(options) { verify(options); assert.equal(options.lock, 'UPDATE'); return state.submissions.find(record => record.nomor_pengajuan === options.where.nomor_pengajuan && record.kode_unit_kerja === options.where.kode_unit_kerja); },
        async create(values, options) { verify(options); const record = { ...values, pengajuan_id: state.submissions.length + 1 }; state.submissions.push(record); return record; },
    };
    const anggarans = { async create(values, options) { verify(options); state.items.push(values); if (failItem) throw new Error('Item gagal'); } };
    const units = { async findOne(options) { verify(options); assert.equal(options.lock, 'UPDATE'); assert.equal(options.where.kode_unit_kerja, 7); return {}; } };
    const pagus = { async findAll(options) {
        verify(options); assert.equal(options.lock, 'UPDATE'); assert.equal(options.where.kode_unit_kerja, 7); assert.equal(options.where.jenis_pagu, 'PNBP');
        if (missingPagu) return [];
        const row = { id: 11, nominal_pagu: state.balance, async update(values, options) { verify(options); state.balance = values.nominal_pagu; } };
        return duplicatePagu ? [row, row] : [row];
    } };
    const accounts = { async findOne(options) { verify(options); return invalidAccount ? null : hierarchy; } };
    const satuans = { async findByPk(code, options) { verify(options); return invalidSatuan ? null : { kode_satuan: code }; } };
    return { submit: createSubmitPengajuanService({ db, pengajuans, anggarans, pagus, units, accounts, satuans }), state };
}

test('server menghitung ulang, memakai unit akun dan hierarki server, lalu mengurangi pagu sekali', async () => {
    const { submit, state } = fixture();
    const result = await submit(actor, { ...body(), kode_unit_kerja: 99, total_nominal_pengajuan: '1' });
    assert.equal(result.total_nominal_diajukan, '80');
    assert.equal(result.sisa_pagu, '20');
    assert.equal(state.submissions[0].kode_unit_kerja, 7);
    assert.equal(state.submissions[0].operator_id, 2);
    assert.equal(state.submissions[0].pagu_id, 11);
    assert.equal(state.submissions[0].jenis_pagu, 'PNBP');
    assert.equal(state.submissions[0].current_position, 'pimpinan_unit');
    assert.equal(state.submissions[0].status, 'pending');
    assert.equal(state.items[0].kode_akun, hierarchy.kode_akun);
    assert.equal(state.items[0].total_nominal, '80');
    assert.equal(state.balance, '20');
    await assert.rejects(submit(actor, body()), error => error.status === 409);
    assert.equal(state.submissions.length, 1);
    assert.equal(state.balance, '20');
});

test('pengajuan sama dengan saldo diterima, melebihi saldo ditolak tanpa data parsial', async () => {
    const equal = fixture();
    await equal.submit(actor, body('USL/1', '50'));
    assert.equal(equal.state.balance, '0');
    const excess = fixture();
    await assert.rejects(excess.submit(actor, body('USL/1', '51')), error => error.status === 409);
    assert.deepEqual(excess.state, { balance: '100', submissions: [], items: [] });
});

test('gagal item atau referensi invalid membatalkan seluruh perubahan', async () => {
    for (const options of [{ failItem: true }, { invalidAccount: true }, { invalidSatuan: true }, { duplicatePagu: true }, { missingPagu: true }]) {
        const { submit, state } = fixture(options);
        await assert.rejects(submit(actor, body()));
        assert.deepEqual(state, { balance: '100', submissions: [], items: [] });
    }
});

test('dua pengajuan bersamaan tidak dapat menggunakan saldo yang sama', async () => {
    const { submit, state } = fixture();
    const results = await Promise.allSettled([submit(actor, body('USL/1')), submit(actor, body('USL/2'))]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && result.reason.status === 409).length, 1);
    assert.equal(state.balance, '20');
    assert.equal(state.submissions.length, 1);
});

test('BIGINT dihitung tepat tanpa pembulatan JavaScript', async () => {
    const { submit, state } = fixture({ balance: '18014398509481986' });
    const result = await submit(actor, body('USL/BIG', '9007199254740993'));
    assert.equal(result.total_nominal_diajukan, '18014398509481986');
    assert.equal(state.balance, '0');
});

test('peran, unit kosong, volume nol/negatif/desimal dan nominal berlebih ditolak', async () => {
    const { submit, state } = fixture();
    for (const account of [{ ...actor, role: 'spi' }, { ...actor, kodeUnitKerja: null }]) await assert.rejects(submit(account, body()), error => error.status === 403);
    for (const volume of ['0', '-1', '1.5', '2147483648']) {
        const request = body(); request.items[0].volume = volume;
        await assert.rejects(submit(actor, request), error => error.status === 400);
    }
    await assert.rejects(submit(actor, body('USL/X', '9223372036854775807')), error => error.status === 400);
    await assert.rejects(submit(actor, { ...body(), items: [] }), error => error.status === 400);
    assert.equal(state.submissions.length, 0);
});
