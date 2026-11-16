const hierarchyLevels = ['pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'];
const forward = { pimpinan_unit: 'tim_sakip', tim_sakip: 'spi', spi: 'kpa', kpa: 'completed' };
const backward = { pimpinan_unit: 'operator', tim_sakip: 'pimpinan_unit', spi: 'tim_sakip', kpa: 'spi' };

function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createVerifyPengajuanService(db, pengajuans, audit) {
    return async (req, body = {}) => {
        if (!Object.hasOwn(forward, req.role)) fail(403, 'Keputusan hanya tersedia untuk Pimpinan Unit, SAKIP, SPI, dan KPA.');
        if (!['approve', 'revise', 'reject'].includes(body.action)) fail(400, 'Aksi verifikasi tidak valid.');
        
        const note = typeof body.catatan_revisi === 'string' ? body.catatan_revisi.trim() : '';
        if (body.action !== 'approve' && !note) fail(400, 'Catatan revisi wajib diisi ketika mengembalikan pengajuan.');
        if (note.length > 5000) fail(400, 'Catatan maksimal 5000 karakter.');

        return db.transaction(async transaction => {
            const record = await pengajuans.findOne({ where: { pengajuan_id: req.params.id }, transaction, lock: transaction.LOCK.UPDATE });
            if (!record) fail(404, 'Pengajuan tidak ditemukan.');
            
            if (req.role === 'pimpinan_unit' && (req.kodeUnitKerja == null || String(record.kode_unit_kerja) !== String(req.kodeUnitKerja))) {
                fail(403, 'Anda tidak berhak memverifikasi pengajuan unit kerja lain.');
            }
            
            if (!['pending', 'revision'].includes(record.status) || record.current_position === 'completed') {
                fail(409, 'Pengajuan ini tidak lagi dapat diputuskan. Muat ulang antrean.');
            }
            
            if (record.current_position !== req.role) {
                fail(403, 'Pengajuan tidak berada pada tahap pemeriksaan peran Anda.');
            }

            const approving = body.action === 'approve';
            const nextPosition = approving ? forward[req.role] : backward[req.role];
            const status = approving ? (nextPosition === 'completed' ? 'approved' : 'pending') : 'revision';

            // Hitung max_position baru (ambil index level terjauh yang pernah dicapai)
            const currentIndex = hierarchyLevels.indexOf(record.max_position || record.current_position);
            const targetIndex = hierarchyLevels.indexOf(nextPosition);
            let newMaxPosition = record.max_position;
            
            if (targetIndex > currentIndex && nextPosition !== 'completed') {
                newMaxPosition = nextPosition;
            }

            await record.update({ 
                current_position: nextPosition, 
                max_position: newMaxPosition,
                status, 
                catatan_revisi: approving ? record.catatan_revisi : note 
            }, { transaction });

            await audit?.(req, {
                module: 'Pemeriksaan', action: approving ? 'SETUJUI' : 'KEMBALIKAN',
                target: record.nomor_pengajuan, pengajuan_id: record.pengajuan_id,
                before: req.role, after: nextPosition, note: note || null,
            }, transaction);

            return {
                msg: approving ? (nextPosition === 'completed' ? 'Pengajuan disetujui final oleh KPA.' : 'Pengajuan disetujui dan diteruskan ke tahap berikutnya.') : 'Pengajuan dikembalikan satu tahap dengan catatan revisi.',
                pengajuan_id: record.pengajuan_id, 
                status, 
                current_position: nextPosition,
            };
        });
    };
}