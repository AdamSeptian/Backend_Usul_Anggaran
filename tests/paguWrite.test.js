import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaguWriteService, validNominal } from '../services/paguWrite.js';

function fixture({ duplicate = false, missingUnit = false, missingPagu = false, createFails = false } = {}) {
    const events = [];
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const state = { nominal_pagu: '100', kode_unit_kerja: 7, jenis_pagu: 'PNBP' };
    const db = { async transaction(run) {
        try { await run(transaction); events.push('commit'); }
        catch (error) { events.push('rollback'); throw error; }
    } };
    function verify(options) { assert.equal(options.transaction, transaction); }
    const units = { async findOne(options) { verify(options); assert.equal(options.lock, 'UPDATE'); return missingUnit ? null : {}; } };
    const sources = { async findOrCreate(options) { verify(options); events.push('source'); } };
    const pagus = {
        async findOne(options) {
            verify(options); assert.equal(options.lock, 'UPDATE');
            if (options.where.id !== undefined) return missingPagu ? null : { ...state, async update(values, options) { verify(options); Object.assign(state, values); events.push('update'); } };
            return duplicate ? {} : null;
        },
        async create(values, options) { verify(options); if (createFails) throw new Error('Database gagal'); Object.assign(state, values); events.push('create'); },
    };
    return { service: createPaguWriteService(db, pagus, units, sources), state, events };
}
const input = { nominal_pagu: '9007199254740993', kode_unit_kerja: '7', jenis_pagu: ' PNBP ' };

test('validasi nominal mendukung nol dan BIGINT tanpa kehilangan presisi', () => {
    assert.equal(validNominal(0), '0');
    assert.equal(validNominal(input.nominal_pagu), input.nominal_pagu);
    for (const value of [-1, '1.5', '', '1e6', null, {}, Number.MAX_SAFE_INTEGER + 1, '9223372036854775808']) assert.throws(() => validNominal(value), error => error.status === 400);
});
test('tambah pagu dan sumber dana tersimpan dalam transaksi', async () => {
    const { service, state, events } = fixture();
    await service.create(input);
    assert.deepEqual(state, { nominal_pagu: input.nominal_pagu, kode_unit_kerja: '7', jenis_pagu: 'PNBP' });
    assert.deepEqual(events, ['source', 'create', 'commit']);
});
test('duplikat, unit tidak ditemukan, dan gagal simpan membatalkan transaksi', async () => {
    for (const [options, status] of [[{ duplicate: true }, 409], [{ missingUnit: true }, 404], [{ createFails: true }, undefined]]) {
        const { service, events } = fixture(options);
        await assert.rejects(service.create(input), error => error.status === status);
        assert.equal(events.at(-1), 'rollback');
        assert.equal(events.includes('commit'), false);
    }
});
test('saldo nol benar-benar tersimpan dan nominal besar tetap tepat', async () => {
    const { service, state } = fixture();
    await service.update('1', { nominal_pagu: 0, expected_nominal_pagu: '100' });
    assert.equal(state.nominal_pagu, '0');
    await service.update('1', { nominal_pagu: input.nominal_pagu, expected_nominal_pagu: '0' });
    assert.equal(state.nominal_pagu, input.nominal_pagu);
});
test('saldo lama yang berubah, identitas berubah, dan pagu hilang ditolak', async () => {
    for (const body of [{ nominal_pagu: '50', expected_nominal_pagu: '99' }, { nominal_pagu: '50', kode_unit_kerja: '8' }, { nominal_pagu: '50', jenis_pagu: 'RM' }]) {
        const { service, state, events } = fixture();
        await assert.rejects(service.update('1', body), error => [400, 409].includes(error.status));
        assert.equal(state.nominal_pagu, '100');
        assert.equal(events.at(-1), 'rollback');
    }
    await assert.rejects(fixture({ missingPagu: true }).service.update('1', { nominal_pagu: '0' }), error => error.status === 404);
});
