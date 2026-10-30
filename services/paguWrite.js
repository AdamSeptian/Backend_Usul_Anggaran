function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function validNominal(value) {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) fail(400, 'Nominal harus berupa rupiah bulat yang valid.');
    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) fail(400, 'Nominal harus berupa rupiah bulat dan tidak negatif.');
    const amount = BigInt(value);
    if (amount > 9223372036854775807n) fail(400, 'Nominal melebihi batas penyimpanan.');
    return amount.toString();
}

export function createPaguWriteService(db, pagus, units, sources) {
    return {
        async create(body = {}) {
            const nominal_pagu = validNominal(body.nominal_pagu);
            const kode_unit_kerja = String(body.kode_unit_kerja ?? '');
            const jenis_pagu = typeof body.jenis_pagu === 'string' ? body.jenis_pagu.trim() : '';
            if (!/^\d+$/.test(kode_unit_kerja) || BigInt(kode_unit_kerja) < 1n || BigInt(kode_unit_kerja) > 2147483647n) fail(400, 'Pilih unit kerja yang valid.');
            if (!jenis_pagu || jenis_pagu.length > 255) fail(400, 'Sumber dana wajib diisi, maksimal 255 karakter.');
            return db.transaction(async transaction => {
                const unit = await units.findOne({ where: { kode_unit_kerja }, transaction, lock: transaction.LOCK.UPDATE });
                if (!unit) fail(404, 'Unit kerja tidak ditemukan.');
                if (await pagus.findOne({ where: { kode_unit_kerja, jenis_pagu }, transaction, lock: transaction.LOCK.UPDATE })) fail(409, 'Pagu unit dan sumber dana ini sudah ada. Gunakan tombol Ubah Saldo.');
                await sources.findOrCreate({ where: { jenis_pagu }, defaults: { jenis_pagu }, transaction });
                await pagus.create({ kode_unit_kerja, jenis_pagu, nominal_pagu }, { transaction });
            });
        },
        async update(id, body = {}) {
            const nominal_pagu = validNominal(body.nominal_pagu);
            return db.transaction(async transaction => {
                const pagu = await pagus.findOne({ where: { id }, transaction, lock: transaction.LOCK.UPDATE });
                if (!pagu) fail(404, 'Data pagu tidak ditemukan.');
                if ((body.kode_unit_kerja !== undefined && String(body.kode_unit_kerja) !== String(pagu.kode_unit_kerja)) || (body.jenis_pagu !== undefined && body.jenis_pagu !== pagu.jenis_pagu)) fail(400, 'Unit kerja dan sumber dana pagu yang sudah dibuat tidak dapat diubah.');
                if (body.expected_nominal_pagu !== undefined && validNominal(body.expected_nominal_pagu) !== String(pagu.nominal_pagu)) fail(409, 'Saldo pagu telah berubah. Tutup formulir, muat ulang daftar, lalu coba lagi.');
                await pagu.update({ nominal_pagu }, { transaction });
            });
        },
    };
}
