const MAX = 9223372036854775807n;
const hierarchyKeys = ['kode_akun', 'kode_sk', 'kode_komponen', 'kode_so', 'kode_output', 'kode_kegiatan', 'kode_program'];
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function integer(value, label, max = MAX) {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) fail(400, `${label} tidak valid.`);
    if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value))) fail(400, `${label} harus bilangan bulat positif.`);
    const result = BigInt(value);
    if (result < 1n || result > max) fail(400, `${label} di luar batas yang diperbolehkan.`);
    return result;
}

export function calculateSubmissionItems(items) {
    if (!Array.isArray(items) || !items.length) fail(400, 'Isi setidaknya satu rincian anggaran.');
    const calculated = items.map((item, index) => {
        if (!item || typeof item !== 'object') fail(400, `Rincian ${index + 1} tidak valid.`);
        const volume = integer(item.volume, `Volume rincian ${index + 1}`, 2147483647n);
        const price = integer(item.nominal_satuan, `Harga rincian ${index + 1}`);
        const amount = volume * price;
        if (amount > MAX) fail(400, `Total rincian ${index + 1} melebihi batas penyimpanan.`);
        return { item, volume: Number(volume), price: price.toString(), amount };
    });
    const total = calculated.reduce((sum, item) => sum + item.amount, 0n);
    if (total > MAX) fail(400, 'Total pengajuan melebihi batas penyimpanan.');
    return { calculated, total };
}

export async function resolveSubmissionItems(calculated, { accounts, satuans }, transaction) {
    const processed = [];
    for (const { item, volume, price, amount } of calculated) {
        let where;
        if (item.akun_id !== undefined) where = { id: integer(item.akun_id, 'Akun hierarki', 2147483647n).toString() };
        else {
            where = {};
            for (const key of hierarchyKeys) {
                if (typeof item[key] !== 'string' || !item[key].trim()) fail(400, 'Pilih akun dari hierarki anggaran yang terdaftar.');
                where[key] = item[key].trim();
            }
        }
        const account = await accounts.findOne({ where, transaction });
        if (!account) fail(400, 'Akun hierarki anggaran tidak ditemukan. Muat ulang referensi.');
        if (typeof item.kode_satuan !== 'string' || !item.kode_satuan.trim()) fail(400, 'Pilih satuan yang terdaftar.');
        const satuan = await satuans.findByPk(item.kode_satuan.trim(), { transaction });
        if (!satuan) fail(400, 'Satuan tidak ditemukan. Muat ulang referensi.');
        const fields = Object.fromEntries(hierarchyKeys.filter(key => key !== 'kode_komponen').map(key => [key, account[key]]));
        processed.push({ ...fields, volume, kode_satuan: satuan.kode_satuan, nominal_satuan: price, total_nominal: amount.toString() });
    }
    return processed;
}

export function createSubmitPengajuanService({ db, pengajuans, anggarans, pagus, units, accounts, satuans }) {
    return async (req, body = {}) => {
        if (!['operator', 'superadmin'].includes(req.role) || req.kodeUnitKerja == null) fail(403, 'Pengajuan membutuhkan akun Operator dengan unit kerja yang terdaftar.');
        const nomor = typeof body.nomor_pengajuan === 'string' ? body.nomor_pengajuan.trim() : '';
        const source = body.jenis_pagu === undefined ? 'PNBP' : typeof body.jenis_pagu === 'string' ? body.jenis_pagu.trim() : '';
        if (!nomor || nomor.length > 255) fail(400, 'Nomor pengajuan wajib diisi, maksimal 255 karakter.');
        if (!source || source.length > 255) fail(400, 'Pilih sumber dana yang valid.');
        const { calculated, total } = calculateSubmissionItems(body.items);
        return db.transaction(async transaction => {
            // Unit lock serializes duplicate-number checks, including across funding sources.
            const unit = await units.findOne({ where: { kode_unit_kerja: req.kodeUnitKerja }, transaction, lock: transaction.LOCK.UPDATE });
            if (!unit) fail(404, 'Unit kerja akun tidak ditemukan.');
            if (await pengajuans.findOne({ where: { nomor_pengajuan: nomor, kode_unit_kerja: req.kodeUnitKerja }, transaction, lock: transaction.LOCK.UPDATE })) fail(409, 'Nomor pengajuan sudah digunakan pada unit ini. Periksa daftar pengajuan sebelum mengirim lagi.');
            const balances = await pagus.findAll({ where: { kode_unit_kerja: req.kodeUnitKerja, jenis_pagu: source }, transaction, lock: transaction.LOCK.UPDATE });
            if (!balances.length) fail(404, 'Pagu sumber dana yang dipilih belum dialokasikan untuk unit akun Anda.');
            if (balances.length !== 1) fail(409, 'Ada pagu ganda untuk unit dan sumber dana ini. Hubungi Admin untuk memperbaikinya.');
            const balance = balances[0];
            const remaining = BigInt(balance.nominal_pagu);
            if (total > remaining) fail(409, `Total pengajuan melebihi sisa pagu ${source} sebesar Rp ${remaining.toLocaleString('id-ID')}. Muat ulang pagu atau kurangi rincian.`);
            const processed = await resolveSubmissionItems(calculated, { accounts, satuans }, transaction);
            const record = await pengajuans.create({ nomor_pengajuan: nomor, operator_id: req.operatorId, kode_unit_kerja: req.kodeUnitKerja, total_nominal_pengajuan: total.toString(), jenis_pagu: source, pagu_id: balance.id, status: 'pending', current_position: 'pimpinan_unit' }, { transaction });
            for (const item of processed) await anggarans.create({ ...item, pengajuan_id: record.pengajuan_id }, { transaction });
            const newBalance = (remaining - total).toString();
            await balance.update({ nominal_pagu: newBalance }, { transaction });
            return { msg: 'Pengajuan berhasil dikirim ke Pimpinan Unit dan saldo pagu diperbarui.', pengajuan_id: record.pengajuan_id, total_nominal_diajukan: total.toString(), sisa_pagu: newBalance };
        });
    };
}
