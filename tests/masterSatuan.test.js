import test from 'node:test';
import assert from 'node:assert/strict';
import { createMasterSatuanService, createDeleteSatuanService } from '../services/masterSatuan.js';

test('tambah satuan merapikan kode dan nama, kode duplikat tidak mengubah data lama', async () => {
    let saved;
    const service = createMasterSatuanService({ async findOrCreate(options) {
        assert.deepEqual(options.where, { kode_satuan: 'PKT' });
        if (saved) return [saved, false];
        saved = { ...options.where, ...options.defaults };
        return [saved, true];
    } });
    await service.create({ kode_satuan: ' PKT ', nama_satuan: ' Paket ' });
    assert.deepEqual(saved, { kode_satuan: 'PKT', nama_satuan: 'Paket' });
    await assert.rejects(service.create({ kode_satuan: 'PKT', nama_satuan: 'Lainnya' }), error => error.status === 409);
    assert.equal(saved.nama_satuan, 'Paket');
});

test('nama satuan dapat diperbarui tanpa mengubah kodenya', async () => {
    let update;
    const service = createMasterSatuanService({ async findByPk(code) {
        assert.equal(code, 'PKT');
        return { async update(values) { update = values; } };
    } });
    await service.update('PKT', { nama_satuan: ' Paket Pekerjaan ' });
    assert.deepEqual(update, { nama_satuan: 'Paket Pekerjaan' });
});

test('kode dan nama kosong, bukan teks, terlalu panjang, atau perubahan kode ditolak sebelum query', async () => {
    const service = createMasterSatuanService({
        async findOrCreate() { assert.fail('Tidak boleh membuat data invalid'); },
        async findByPk() { assert.fail('Tidak boleh mengubah kode'); },
    });
    for (const body of [{}, { kode_satuan: ' ', nama_satuan: 'Paket' }, { kode_satuan: 1, nama_satuan: 'Paket' }, { kode_satuan: 'PKT', nama_satuan: ' ' }, { kode_satuan: 'PKT', nama_satuan: 'a'.repeat(256) }]) {
        await assert.rejects(service.create(body), error => error.status === 400);
    }
    await assert.rejects(service.update('PKT', { kode_satuan: 'ORG', nama_satuan: 'Orang' }), error => error.status === 400);
});

test('ubah satuan yang tidak ada menghasilkan 404 dan kegagalan database diteruskan', async () => {
    const missing = createMasterSatuanService({ async findByPk() { return null; } });
    await assert.rejects(missing.update('PKT', { nama_satuan: 'Paket' }), error => error.status === 404);
    const broken = createMasterSatuanService({ async findOrCreate() { throw new Error('Database gagal'); } });
    await assert.rejects(broken.create({ kode_satuan: 'PKT', nama_satuan: 'Paket' }), /Database gagal/);
});

for (const scenario of ['unused', 'used', 'missing', 'failed']) {
    test(`hapus satuan: ${scenario}`, async () => {
        const events = [];
        const transaction = { LOCK: { UPDATE: 'UPDATE' } };
        const db = { async transaction(run) {
            try { await run(transaction); events.push('commit'); }
            catch (error) { events.push('rollback'); throw error; }
        } };
        function verify(options) {
            assert.equal(options.transaction, transaction);
            assert.equal(options.lock, 'UPDATE');
            assert.deepEqual(options.where, { kode_satuan: 'PKT' });
        }
        const satuans = { async findOne(options) {
            verify(options);
            events.push('lock-satuan');
            return scenario === 'missing' ? null : { async destroy(options) {
                assert.equal(options.transaction, transaction);
                events.push('delete');
                if (scenario === 'failed') throw new Error('Database gagal');
            } };
        } };
        const anggarans = { async findOne(options) {
            verify(options);
            assert.equal(events[0], 'lock-satuan');
            events.push('check-anggaran');
            return scenario === 'used' ? {} : null;
        } };
        const remove = createDeleteSatuanService(db, satuans, anggarans);
        if (scenario === 'unused') {
            await remove('PKT');
            assert.deepEqual(events, ['lock-satuan', 'check-anggaran', 'delete', 'commit']);
        } else {
            await assert.rejects(remove('PKT'), error => scenario === 'failed' ? error.message === 'Database gagal' : error.status === (scenario === 'used' ? 409 : 404));
            assert.equal(events.at(-1), 'rollback');
            if (scenario !== 'failed') assert.equal(events.includes('delete'), false);
        }
    });
}
