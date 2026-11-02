import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerifyPengajuanService } from '../services/verifyPengajuan.js';

function fixture(initial = {}, failed = false) {
    const state = { pengajuan_id: 1, kode_unit_kerja: 7, current_position: 'pimpinan_unit', status: 'pending', total_nominal_pengajuan: '80', catatan_revisi: null, updatedAt: '2026-10-29T01:00:00.000Z', ...initial };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    let queue = Promise.resolve();
    let updates = 0;
    const db = { transaction(run) {
        const operation = queue.then(async () => {
            const copy = structuredClone(state);
            try { return await run(transaction); }
            catch (error) { Object.assign(state, copy); throw error; }
        });
        queue = operation.catch(() => {});
        return operation;
    } };
    const model = { async findOne(options) {
        assert.equal(options.transaction, transaction);
        assert.equal(options.lock, 'UPDATE');
        if (options.where.pengajuan_id !== '1') return null;
        return { ...state, async update(values, options) {
            assert.equal(options.transaction, transaction);
            Object.assign(state, values);
            updates++;
            state.updatedAt = new Date(Date.parse(state.updatedAt) + 1000).toISOString();
            if (failed) throw new Error('Database gagal');
        } };
    } };
    return { verify: createVerifyPengajuanService(db, model), state, updates: () => updates };
}
const req = role => ({ role, kodeUnitKerja: 7, params: { id: '1' } });

test('persetujuan bertingkat berakhir di KPA tanpa mengubah nominal pengajuan', async () => {
    const { verify, state } = fixture();
    for (const [role, next] of [['pimpinan_unit', 'tim_sakip'], ['tim_sakip', 'spi'], ['spi', 'kpa'], ['kpa', 'completed']]) {
        const result = await verify(req(role), { action: 'approve' });
        assert.equal(result.current_position, next);
        assert.equal(state.status, next === 'completed' ? 'approved' : 'pending');
        assert.equal(state.total_nominal_pengajuan, '80');
    }
    await assert.rejects(verify(req('kpa'), { action: 'approve' }), error => error.status === 409);
});

test('pengembalian selalu satu tahap dengan alasan dan status revision', async () => {
    for (const [role, previous] of [['pimpinan_unit', 'operator'], ['tim_sakip', 'pimpinan_unit'], ['spi', 'tim_sakip'], ['kpa', 'spi']]) {
        const { verify, state } = fixture({ current_position: role });
        await verify(req(role), { action: 'revise', catatan_revisi: ' Perbaiki rincian ' });
        assert.equal(state.current_position, previous);
        assert.equal(state.status, 'revision');
        assert.equal(state.catatan_revisi, 'Perbaiki rincian');
    }
});

test('revisi yang disetujui kembali menjadi pending dan alias reject tetap pengembalian', async () => {
    const { verify, state } = fixture({ status: 'revision', catatan_revisi: 'Catatan sebelumnya' });
    await verify(req('pimpinan_unit'), { action: 'approve' });
    assert.equal(state.status, 'pending');
    assert.equal(state.catatan_revisi, 'Catatan sebelumnya');
    await verify(req('tim_sakip'), { action: 'reject', catatan_revisi: 'Koreksi lagi' });
    assert.equal(state.current_position, 'pimpinan_unit');
    assert.equal(state.status, 'revision');
});

test('role salah, tahap salah, unit lain, alasan kosong dan aksi invalid ditolak', async () => {
    const { verify, state, updates } = fixture();
    for (const role of ['operator', 'superadmin', 'unknown']) await assert.rejects(verify(req(role), { action: 'approve' }), error => error.status === 403);
    await assert.rejects(verify(req('spi'), { action: 'approve' }), error => error.status === 403);
    await assert.rejects(verify({ ...req('pimpinan_unit'), kodeUnitKerja: 8 }, { action: 'approve' }), error => error.status === 403);
    await assert.rejects(verify(req('pimpinan_unit'), { action: 'revise', catatan_revisi: '   ' }), error => error.status === 400);
    await assert.rejects(verify(req('pimpinan_unit'), { action: 'invalid' }), error => error.status === 400);
    assert.equal(updates(), 0);
    assert.equal(state.current_position, 'pimpinan_unit');
});

test('detail kedaluwarsa, draf dan pengajuan hilang ditolak', async () => {
    const { verify } = fixture();
    for (const expected of [{ expected_position: 'spi' }, { expected_status: 'revision' }, { expected_updated_at: '2026-10-28T01:00:00Z' }]) await assert.rejects(verify(req('pimpinan_unit'), { action: 'approve', ...expected }), error => error.status === 409);
    await assert.rejects(fixture({ status: 'draft' }).verify(req('pimpinan_unit'), { action: 'approve' }), error => error.status === 409);
    await assert.rejects(verify({ ...req('pimpinan_unit'), params: { id: '999' } }, { action: 'approve' }), error => error.status === 404);
});

test('dua keputusan bersamaan hanya memproses satu perubahan tahap', async () => {
    const { verify, state, updates } = fixture();
    const results = await Promise.allSettled([verify(req('pimpinan_unit'), { action: 'approve' }), verify(req('pimpinan_unit'), { action: 'approve' })]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(updates(), 1);
    assert.equal(state.current_position, 'tim_sakip');
});

test('kegagalan penyimpanan membatalkan perubahan', async () => {
    const { verify, state } = fixture({}, true);
    await assert.rejects(verify(req('pimpinan_unit'), { action: 'approve' }), /Database gagal/);
    assert.equal(state.current_position, 'pimpinan_unit');
    assert.equal(state.status, 'pending');
});
