import test from 'node:test';
import assert from 'node:assert/strict';
import { paguScope } from '../services/paguScope.js';

test('operator dan pimpinan dibatasi ke unit akun untuk daftar dan detail pagu', () => {
    for (const role of ['operator', 'pimpinan_unit']) {
        assert.deepEqual(paguScope({ role, kodeUnitKerja: 7 }), { kode_unit_kerja: 7 });
        assert.deepEqual(paguScope({ role, kodeUnitKerja: 7 }, '99'), { id: '99', kode_unit_kerja: 7 });
        for (const kodeUnitKerja of [null, undefined]) assert.throws(() => paguScope({ role, kodeUnitKerja }), error => error.status === 403);
    }
});

test('role lintas unit dapat membaca daftar dan detail tanpa filter unit', () => {
    for (const role of ['superadmin', 'tim_sakip', 'spi', 'kpa']) {
        assert.deepEqual(paguScope({ role, kodeUnitKerja: null }), {});
        assert.deepEqual(paguScope({ role }, '2'), { id: '2' });
    }
});
