import test from 'node:test';
import assert from 'node:assert/strict';
import { createMasterAkunService, createDeleteAkunService } from '../services/masterAkun.js';

test('tambah akun anggaran merapikan kode dan nama, kode duplikat tidak mengubah data lama', async () => {
    let saved;
    const service = createMasterAkunService({ async findOrCreate(options) {
        assert.deepEqual(options.where, { kode_akun: '521211' });
        if (saved) return [saved, false];
        saved = { ...options.where, ...options.defaults };
        return [saved, true];
    } });
    await service.create({ kode_akun: ' 521211 ', nama_akun: ' Paket ' });
    assert.deepEqual(saved, { kode_akun: '521211', nama_akun: 'Paket' });
    await assert.rejects(service.create({ kode_akun: '521211', nama_akun: 'Lainnya' }), error => error.status === 409);
    assert.equal(saved.nama_akun, 'Paket');
});

test('nama akun anggaran dapat diperbarui tanpa mengubah kodenya', async () => {
    let update;
    const service = createMasterAkunService({ async findByPk(code) {
        assert.equal(code, '521211');
        return { async update(values) { update = values; } };
    } });
    await service.update('521211', { nama_akun: ' Paket Pekerjaan ' });
    assert.deepEqual(update, { nama_akun: 'Paket Pekerjaan' });
});

test('kode dan nama kosong, bukan teks, terlalu panjang, atau perubahan kode ditolak sebelum query', async () => {
    const service = createMasterAkunService({
        async findOrCreate() { assert.fail('Tidak boleh membuat data invalid'); },
        async findByPk() { assert.fail('Tidak boleh mengubah kode'); },
    });
    for (const body of [{}, { kode_akun: ' ', nama_akun: 'Paket' }, { kode_akun: 1, nama_akun: 'Paket' }, { kode_akun: '521211', nama_akun: ' ' }, { kode_akun: '521211', nama_akun: 'a'.repeat(256) }]) {
        await assert.rejects(service.create(body), error => error.status === 400);
    }
    await assert.rejects(service.update('521211', { kode_akun: '521212', nama_akun: 'Orang' }), error => error.status === 400);
});

test('ubah akun anggaran yang tidak ada menghasilkan 404 dan kegagalan database diteruskan', async () => {
    const missing = createMasterAkunService({ async findByPk() { return null; } });
    await assert.rejects(missing.update('521211', { nama_akun: 'Paket' }), error => error.status === 404);
    const broken = createMasterAkunService({ async findOrCreate() { throw new Error('Database gagal'); } });
    await assert.rejects(broken.create({ kode_akun: '521211', nama_akun: 'Paket' }), /Database gagal/);
});

test('kode akun baru harus 6 digit angka', async () => {
    const service = createMasterAkunService({ async findOrCreate() { assert.fail('Kode invalid tidak boleh disimpan'); } });
    for (const kode_akun of ['12345', '1234567', 'ABCDEF']) {
        await assert.rejects(service.create({ kode_akun, nama_akun: 'Belanja' }), error => error.status === 400);
    }
});

for (const scenario of ['unused', 'hierarki akun', 'rincian anggaran', 'missing', 'failed']) {
    test(`hapus akun: ${scenario}`, async () => {
        const events = [];
        const transaction = { LOCK: { UPDATE: 'UPDATE' } };
        const db = { async transaction(run) {
            try { await run(transaction); events.push('commit'); }
            catch (error) { events.push('rollback'); throw error; }
        } };
        function verify(options) {
            assert.equal(options.transaction, transaction);
            assert.equal(options.lock, 'UPDATE');
            assert.deepEqual(options.where, { kode_akun: '521211' });
        }
        const accounts = { async findOne(options) {
            verify(options);
            events.push('lock-parent');
            return scenario === 'missing' ? null : { async destroy(options) {
                assert.equal(options.transaction, transaction);
                events.push('delete');
                if (scenario === 'failed') throw new Error('Database gagal');
            } };
        } };
        const refs = ['hierarki akun', 'rincian anggaran'].map(label => ({ label, model: { async findOne(options) {
            verify(options);
            assert.equal(events[0], 'lock-parent');
            events.push(label);
            return scenario === label ? {} : null;
        } } }));
        const remove = createDeleteAkunService(db, accounts, refs);
        if (scenario === 'unused') {
            await remove('521211');
            assert.deepEqual(events, ['lock-parent', 'hierarki akun', 'rincian anggaran', 'delete', 'commit']);
        } else {
            await assert.rejects(remove('521211'), error => scenario === 'failed' ? error.message === 'Database gagal' : error.status === (scenario === 'missing' ? 404 : 409));
            assert.equal(events.at(-1), 'rollback');
            if (scenario !== 'failed') assert.equal(events.includes('delete'), false);
        }
    });
}

