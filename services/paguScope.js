export function paguScope(req, id) {
    const where = id === undefined ? {} : { id };
    if (['operator', 'pimpinan_unit'].includes(req.role)) {
        if (req.kodeUnitKerja === null || req.kodeUnitKerja === undefined) {
            throw Object.assign(new Error('Akun Anda belum memiliki unit kerja. Hubungi administrator.'), { status: 403 });
        }
        where.kode_unit_kerja = req.kodeUnitKerja;
    }
    return where;
}
