import { Op } from "sequelize";

export function pengajuanScope(req, inOperator, id) {
    const where = id === undefined ? {} : { pengajuan_id: id };

    // Jika role adalah operator unit atau operator
    if (['operator', 'operator_unit', 'pimpinan_unit'].includes(req.role)) {
        if (req.kodeUnitKerja === null || req.kodeUnitKerja === undefined) {
            throw Object.assign(new Error('Akun belum memiliki unit kerja. Hubungi administrator.'), { status: 403 });
        }
        where.kode_unit_kerja = req.kodeUnitKerja;
    }

    // Aturan visibilitas berbasis max_position (History Level Tercapai)
    // SAKIP, SPI, KPA hanya bisa melihat jika max_position mereka sudah terlewati/tercapai.
    const levels = ['pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'];
    
    if (req.role === 'pimpinan_unit') {
        // Pimpinan unit melihat semua pengajuan di unitnya yang max_position-nya >= pimpinan_unit
        where.max_position = { [Op.in]: ['pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'] };
    } else if (req.role === 'tim_sakip') {
        where.max_position = { [Op.in]: ['tim_sakip', 'spi', 'kpa', 'completed'] };
    } else if (req.role === 'spi') {
        where.max_position = { [Op.in]: ['spi', 'kpa', 'completed'] };
    } else if (req.role === 'kpa') {
        where.max_position = { [Op.in]: ['kpa', 'completed'] };
    } else if (!['operator', 'operator_unit', 'superadmin'].includes(req.role)) {
        throw Object.assign(new Error('Akses pengajuan ditolak untuk peran ini.'), { status: 403 });
    }

    return where;
}