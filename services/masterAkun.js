function fail(status, message) {
    throw Object.assign(new Error(message), { status });
}

function text(value, label) {
    if (typeof value !== 'string' || !value.trim()) fail(400, `${label} wajib diisi.`);
    if (value.trim().length > 255) fail(400, `${label} maksimal 255 karakter.`);
    return value.trim();
}

export function createMasterAkunService(model) {
    return {
        async create(body = {}) {
            const kode_akun = text(body.kode_akun, 'Kode akun anggaran');
            if (!/^\d{6}$/.test(kode_akun)) fail(400, 'Kode akun anggaran harus terdiri dari 6 digit.');
            const nama_akun = text(body.nama_akun, 'Nama akun anggaran');
            const [, created] = await model.findOrCreate({ where: { kode_akun }, defaults: { nama_akun } });
            if (!created) fail(409, 'Kode akun anggaran sudah digunakan. Gunakan tombol Ubah untuk mengganti namanya.');
        },
        async update(code, body = {}) {
            const kode_akun = text(code, 'Kode akun anggaran');
            const nama_akun = text(body.nama_akun, 'Nama akun anggaran');
            if (body.kode_akun !== undefined && body.kode_akun !== kode_akun) fail(400, 'Kode akun anggaran tidak dapat diubah.');
            const unit = await model.findByPk(kode_akun);
            if (!unit) fail(404, 'Master akun anggaran tidak ditemukan.');
            await unit.update({ nama_akun });
        },
    };
}

export function createDeleteAkunService(db, akuns, references) {
    return async (code) => db.transaction(async (transaction) => {
        const options = { where: { kode_akun: code }, transaction, lock: transaction.LOCK.UPDATE };
        const akun = await akuns.findOne(options);
        if (!akun) fail(404, 'Master akun anggaran tidak ditemukan.');
        for (const { model, label } of references) {
            if (await model.findOne(options)) fail(409, `Akun anggaran tidak dapat dihapus karena masih digunakan oleh ${label}.`);
        }
        await akun.destroy({ transaction });
    });
}

