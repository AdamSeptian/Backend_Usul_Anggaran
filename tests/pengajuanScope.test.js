import test from 'node:test';
import assert from 'node:assert/strict';
import { pengajuanScope } from '../services/pengajuanScope.js';

const inOperator = Symbol('in');

test('operator dan pimpinan hanya membaca pengajuan unit akun, termasuk detail', () => {
    assert.deepEqual(pengajuanScope({ role: 'operator', kodeUnitKerja: 7 }, inOperator), { kode_unit_kerja: 7 });
    assert.deepEqual(pengajuanScope({ role: 'operator', kodeUnitKerja: 7 }, inOperator, '12'), { kode_unit_kerja: 7, pengajuan_id: '12' });
    const leader = pengajuanScope({ role: 'pimpinan_unit', kodeUnitKerja: 7 }, inOperator, '12');
    assert.equal(leader.kode_unit_kerja, 7);
    assert.equal(leader.pengajuan_id, '12');
    assert.deepEqual(leader.current_position[inOperator], ['pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed']);
});

test('pemeriksa hanya membaca tahap yang sesuai pada daftar dan detail', () => {
    for (const [role, stages] of [
        ['tim_sakip', ['tim_sakip', 'spi', 'kpa', 'completed']],
        ['spi', ['spi', 'kpa', 'completed']],
        ['kpa', ['kpa', 'completed']],
    ]) {
        assert.deepEqual(pengajuanScope({ role }, inOperator).current_position[inOperator], stages);
        const detail = pengajuanScope({ role }, inOperator, '99');
        assert.deepEqual(detail.current_position[inOperator], stages);
        assert.equal(detail.pengajuan_id, '99');
        assert.equal(detail.kode_unit_kerja, undefined);
    }
});

test('Admin dapat membaca seluruh daftar, role tidak dikenal dan akun tanpa unit ditolak', () => {
    assert.deepEqual(pengajuanScope({ role: 'superadmin' }, inOperator), {});
    assert.deepEqual(pengajuanScope({ role: 'superadmin' }, inOperator, '12'), { pengajuan_id: '12' });
    for (const role of ['operator', 'pimpinan_unit']) for (const kodeUnitKerja of [null, undefined]) assert.throws(() => pengajuanScope({ role, kodeUnitKerja }, inOperator), error => error.status === 403);
    assert.throws(() => pengajuanScope({ role: 'unknown' }, inOperator), error => error.status === 403);
});
