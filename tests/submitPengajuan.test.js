import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { createSubmitPengajuanService } from '../services/submitPengajuan.js';

const actor = { role: 'operator', operatorId: 2, kodeUnitKerja: 7 };
const hierarchy = { id: 1, kode_akun: '521211', kode_sk: 'A', kode_komponen: '004', kode_so: '001', kode_output: 'BEI', kode_kegiatan: '7732', kode_program: 'DK' };
const body = (nomor = 'USL/1', price = '40') => ({ nomor_pengajuan: nomor, jenis_pagu: 'PNBP', items: [{ kode_akun: '521211', kode_sk: 'A', kode_komponen: '004', kode_so: '001', kode_output: 'BEI', kode_kegiatan: '7732', kode_program: 'DK', kode_iku: 'IKU 1', target_iku: '82', kode_jenis_belanja: '2', nama_item: 'Belanja bahan', volume: '2', nominal_satuan: price, kode_satuan: 'PKT', total_nominal: '1' }] });

function fixture({ balance = '100', failItem = false, duplicatePagu = false, invalidAccount = false, invalidSatuan = false, missingPagu = false, audit, existing = [] } = {}) {
    const state = { balance, submissions: [...existing], items: [] };
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
        async findAll(options) {
            verify(options);
            assert.equal(options.lock, 'UPDATE');
            const prefix = options.where.nomor_pengajuan[Op.like].slice(0, -1);
            return state.submissions.filter(record => record.kode_unit_kerja === options.where.kode_unit_kerja && record.nomor_pengajuan.startsWith(prefix));
        },
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
    const accounts = { async findByPk(code, options) { verify(options); return invalidAccount ? null : { kode_akun: code }; } };
    const satuans = { async findByPk(code, options) { verify(options); return invalidSatuan ? null : { kode_satuan: code }; } };
    const byPk = { async findByPk(code, options) { verify(options); return code; } };
    const byFields = { async findOne(options) { verify(options); return options.where; } };
    const references = { accounts, satuans, spendingTypes: byPk, subcomponents: byPk, indicators: byPk, suboutputs: byFields, components: byFields, activities: byFields };
    return { submit: createSubmitPengajuanService({ db, pengajuans, anggarans, pagus, units, references, audit }), state };
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
    assert.equal(state.items[0].kode_komponen, '004');
    assert.equal(state.items[0].target_iku, '82');
    assert.equal(state.balance, '20');
    assert.match(result.nomor_pengajuan, /^USL\/\d{4}\/07\/0001$/);
    assert.equal(state.submissions[0].nomor_pengajuan, result.nomor_pengajuan);
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

test('sumber pagu ditentukan dari kegiatan dan rincian campuran ditolak sebelum transaksi', async () => {
    const { submit, state } = fixture();
    const request = body();
    await assert.rejects(submit(actor, { ...request, jenis_pagu: 'RM' }), /tidak sesuai/);
    await assert.rejects(submit(actor, { ...request, items: [...request.items, { ...request.items[0], kode_kegiatan: '7731' }] }), /Pisahkan/);
    assert.equal(state.balance, '100');
    delete request.jenis_pagu;
    await submit(actor, request);
    assert.equal(state.submissions[0].jenis_pagu, 'PNBP');
});
test('pengajuan mencatat audit di transaksi yang sama dan gagal utuh bila audit tidak tersimpan', async () => {
    const { submit, state } = fixture({ async audit(req, event, transaction) {
        assert.equal(req.operatorId, 2);
        assert.match(event.target, /^USL\/\d{4}\/07\/0001$/);
        assert.equal(event.after, 'pimpinan_unit');
        assert.equal(event.pengajuan_id, 1);
        assert.equal(transaction.LOCK.UPDATE, 'UPDATE');
        throw new Error('Audit tidak tersimpan');
    } });
    await assert.rejects(submit(actor, body()), /Audit tidak tersimpan/);
    assert.deepEqual(state, { balance: '100', submissions: [], items: [] });
});
test('nomor otomatis melanjutkan urutan unit dan tahun tanpa bentrok saat dikirim bersamaan', async () => {
    const year = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date());
    const prefix = 'USL/' + year + '/07/';
    const { submit } = fixture({ balance: '160', existing: [
        { kode_unit_kerja: 7, nomor_pengajuan: prefix + '0007' },
        { kode_unit_kerja: 7, nomor_pengajuan: 'UJI-001' },
        { kode_unit_kerja: 7, nomor_pengajuan: 'USL/' + (Number(year) - 1) + '/07/0999' },
        { kode_unit_kerja: 8, nomor_pengajuan: 'USL/' + year + '/08/0999' },
    ] });
    const results = await Promise.all([submit(actor, body('MANUAL-1')), submit(actor, body('MANUAL-2'))]);
    assert.deepEqual(results.map(result => result.nomor_pengajuan), [prefix + '0008', prefix + '0009']);
});