import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeleteUnitService } from '../services/deleteUnit.js';

function fixture(usedBy = [], missing = false, deleteError = null) {
    const events = [];
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const db = { async transaction(run) {
        try { const result = await run(transaction); events.push('commit'); return result; }
        catch (error) { events.push('rollback'); throw error; }
    } };
    function checkOptions(options) {
        assert.equal(options.transaction, transaction);
        assert.equal(options.lock, 'UPDATE');
        assert.deepEqual(options.where, { kode_unit_kerja: '7' });
    }
    const units = { async findOne(options) {
        checkOptions(options);
        events.push('lock-parent');
        return missing ? null : { async destroy(options) {
            assert.equal(options.transaction, transaction);
            events.push('delete');
            if (deleteError) throw deleteError;
        } };
    } };
    const references = ['operator/pengguna', 'pengajuan anggaran', 'alokasi pagu'].map(label => ({
        label, model: { async findOne(options) {
            checkOptions(options);
            assert.equal(events[0], 'lock-parent');
            events.push(label);
            return usedBy.includes(label) ? {} : null;
        } },
    }));
    return { remove: createDeleteUnitService(db, units, references), events };
}

test('unit kosong dihapus setelah seluruh referensi diperiksa di dalam transaksi', async () => {
    const { remove, events } = fixture();
    await remove('7');
    assert.deepEqual(events, ['lock-parent', 'operator/pengguna', 'pengajuan anggaran', 'alokasi pagu', 'delete', 'commit']);
});

for (const label of ['operator/pengguna', 'pengajuan anggaran', 'alokasi pagu']) {
    test(`unit yang digunakan ${label} ditolak tanpa menghapus data`, async () => {
        const { remove, events } = fixture([label]);
        await assert.rejects(remove('7'), error => error.status === 409 && error.message.includes(label));
        assert.equal(events.includes('delete'), false);
        assert.equal(events.at(-1), 'rollback');
    });
}

test('unit tidak ditemukan menghasilkan 404 tanpa penghapusan', async () => {
    const { remove, events } = fixture([], true);
    await assert.rejects(remove('7'), error => error.status === 404);
    assert.deepEqual(events, ['lock-parent', 'rollback']);
});

test('gagal menghapus menyebabkan transaksi gagal, bukan commit', async () => {
    const { remove, events } = fixture([], false, new Error('Database gagal'));
    await assert.rejects(remove('7'), /Database gagal/);
    assert.equal(events.at(-1), 'rollback');
    assert.equal(events.includes('commit'), false);
});
