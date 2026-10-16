function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}

function text(value, label) {
    if (typeof value !== 'string' || !value.trim()) fail(400, `${label} wajib diisi.`);
    if (value.trim().length > 255) fail(400, `${label} maksimal 255 karakter.`);
    return value.trim();
}

export function createMasterSatuanService(model) {
    return {
        async create(body = {}) {
            const kode_satuan = text(body.kode_satuan, 'Kode satuan');
            const nama_satuan = text(body.nama_satuan, 'Nama satuan');
            const [, created] = await model.findOrCreate({ where: { kode_satuan }, defaults: { nama_satuan } });
            if (!created) fail(409, 'Kode satuan sudah digunakan. Gunakan tombol Ubah untuk mengganti namanya.');
        },
        async update(code, body = {}) {
            const kode_satuan = text(code, 'Kode satuan');
            const nama_satuan = text(body.nama_satuan, 'Nama satuan');
            if (body.kode_satuan !== undefined && body.kode_satuan !== kode_satuan) fail(400, 'Kode satuan tidak dapat diubah.');
            const unit = await model.findByPk(kode_satuan);
            if (!unit) fail(404, 'Master satuan tidak ditemukan.');
            await unit.update({ nama_satuan });
        },
    };
}

export function createDeleteSatuanService(db, satuans, anggarans) {
    return async (code) => db.transaction(async (transaction) => {
        const where = { kode_satuan: code };
        const options = { where, transaction, lock: transaction.LOCK.UPDATE };
        const satuan = await satuans.findOne(options);
        if (!satuan) fail(404, 'Master satuan tidak ditemukan.');
        // Locking reads and the parent FK lock keep new references from racing deletion.
        if (await anggarans.findOne(options)) fail(409, 'Satuan tidak dapat dihapus karena masih digunakan oleh rincian anggaran.');
        await satuan.destroy({ transaction });
    });
}
