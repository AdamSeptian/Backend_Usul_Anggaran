export function pengajuanScope(req, inOperator, id) {
    const where = id === undefined ? {} : { pengajuan_id: id };
    const stages = {
        pimpinan_unit: ['pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'],
        tim_sakip: ['tim_sakip', 'spi', 'kpa', 'completed'],
        spi: ['spi', 'kpa', 'completed'],
        kpa: ['kpa', 'completed'],
    };
    if (['operator', 'operator_unit', 'pimpinan_unit'].includes(req.role)) {
        if (req.kodeUnitKerja === null || req.kodeUnitKerja === undefined) throw Object.assign(new Error('Akun belum memiliki unit kerja. Hubungi administrator.'), { status: 403 });
        where.kode_unit_kerja = req.kodeUnitKerja;
    }
    if (Object.hasOwn(stages, req.role)) where.current_position = { [inOperator]: stages[req.role] };
    else if (!['operator', 'operator_unit', 'superadmin'].includes(req.role)) throw Object.assign(new Error('Akses pengajuan ditolak untuk peran ini.'), { status: 403 });
    return where;
}
