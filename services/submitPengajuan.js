import { Op } from 'sequelize';

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

function requiredText(value, label) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 255) {
        fail(400, label + ' wajib diisi, maksimal 255 karakter.');
    }
    return value.trim();
}

export async function resolveSubmissionItems(calculated, references, transaction) {
    const { accounts, satuans, spendingTypes, subcomponents, suboutputs, components, activities, indicators } = references;
    const processed = [];
    for (const { item, volume, price, amount } of calculated) {
        const fields = Object.fromEntries(hierarchyKeys.map(key => [key, requiredText(item[key], key.replaceAll('_', ' '))]));
        const nama_item = requiredText(item.nama_item, 'Nama item');
        const kode_iku = requiredText(item.kode_iku, 'Kode IKU');
        const kode_satuan = requiredText(item.kode_satuan, 'Satuan');
        const kode_jenis_belanja = Number(integer(item.kode_jenis_belanja, 'Jenis belanja', 2147483647n));
        const target_iku = String(item.target_iku ?? '').trim();
        if (!/^\d{1,3}(\.\d{1,2})?$/.test(target_iku)) fail(400, 'Target IKU harus 0–999,99 dengan maksimal dua angka desimal.');

        const opts = { transaction };
        const hierarchy = { kode_so: fields.kode_so, kode_output: fields.kode_output, kode_kegiatan: fields.kode_kegiatan };
        if (!await accounts.findByPk(fields.kode_akun, opts)) fail(400, 'Kode akun tidak terdaftar.');
        if (!await subcomponents.findByPk(fields.kode_sk, opts)) fail(400, 'Kode SK tidak terdaftar.');
        if (!await activities.findOne({ ...opts, where: { kode_kegiatan: fields.kode_kegiatan, kode_program: fields.kode_program } })) {
            fail(400, 'Kode kegiatan tidak sesuai dengan program.');
        }
        if (!await suboutputs.findOne({ ...opts, where: hierarchy })) fail(400, 'Kode SO, output, dan kegiatan tidak cocok.');
        if (!await components.findOne({ ...opts, where: { ...hierarchy, kode_komponen: fields.kode_komponen } })) {
            fail(400, 'Kode komponen tidak sesuai dengan SO, output, dan kegiatan.');
        }
        if (!await indicators.findByPk(kode_iku, opts)) fail(400, 'Kode IKU tidak terdaftar.');
        if (!await spendingTypes.findByPk(kode_jenis_belanja, opts)) fail(400, 'Jenis belanja tidak terdaftar.');
        if (!await satuans.findByPk(kode_satuan, opts)) fail(400, 'Satuan tidak ditemukan. Muat ulang referensi.');
        processed.push({ ...fields, nama_item, kode_iku, target_iku, kode_jenis_belanja, volume, kode_satuan, nominal_satuan: price, total_nominal: amount.toString() });
    }
    return processed;
}

const sourceByActivity = new Map([['7731', 'BOPTN'], ['7732', 'PNBP'], ['7734', 'RM']]);

export function submissionFundingSource(calculated, requested) {
    const sources = new Set(calculated.map(({ item }) => sourceByActivity.get(String(item.kode_kegiatan ?? '').trim())));
    if (sources.has(undefined)) fail(400, 'Kode kegiatan belum memiliki jenis pagu.');
    if (sources.size !== 1) fail(400, 'Pisahkan pengajuan jika rincian memakai jenis pagu berbeda.');
    const [source] = sources;
    if (requested !== undefined && (typeof requested !== 'string' || requested.trim().toUpperCase() !== source)) {
        fail(400, 'Jenis pagu tidak sesuai dengan kode kegiatan.');
    }
    return source;
}

const numberingYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Jakarta' });

async function nextSubmissionNumber(pengajuans, unitCode, letter, transaction) {
    const prefix = 'USL/' + numberingYear.format(new Date()) + '/' + (letter || String(unitCode).padStart(2, '0')) + '/';
    const existing = await pengajuans.findAll({
        where: { ...(letter ? {} : { kode_unit_kerja: unitCode }), nomor_pengajuan: { [Op.like]: prefix + '%' } },
        attributes: ['nomor_pengajuan'], raw: true, transaction, lock: transaction.LOCK.UPDATE,
    });
    let latest = 0n;
    for (const record of existing) {
        if (!record.nomor_pengajuan.startsWith(prefix)) continue;
        const suffix = record.nomor_pengajuan.slice(prefix.length);
        if (!/^\d+$/.test(suffix)) continue;
        const number = BigInt(suffix);
        if (number > latest) latest = number;
    }
    return prefix + (latest + 1n).toString().padStart(4, '0');
}

export function createSubmitPengajuanService({ db, pengajuans, anggarans, pagus, units, references, audit }) {
    return async (req, body = {}) => {
        if (!['operator', 'superadmin'].includes(req.role) || req.kodeUnitKerja == null) fail(403, 'Pengajuan membutuhkan akun Operator dengan unit kerja yang terdaftar.');
        const { calculated, total } = calculateSubmissionItems(body.items);
        const source = submissionFundingSource(calculated, body.jenis_pagu);
        return db.transaction(async transaction => {
            // One unit lock serializes number allocation across funding sources.
            const unit = await units.findOne({ where: { kode_unit_kerja: req.kodeUnitKerja }, transaction, lock: transaction.LOCK.UPDATE });
            if (!unit) fail(404, 'Unit kerja akun tidak ditemukan.');
            const balances = await pagus.findAll({ where: { kode_unit_kerja: req.kodeUnitKerja, jenis_pagu: source }, transaction, lock: transaction.LOCK.UPDATE });
            if (!balances.length) fail(404, 'Pagu sumber dana yang dipilih belum dialokasikan untuk unit akun Anda.');
            if (balances.length !== 1) fail(409, 'Ada pagu ganda untuk unit dan sumber dana ini. Hubungi Admin untuk memperbaikinya.');
            const balance = balances[0];
            const remaining = BigInt(balance.nominal_pagu);
            if (total > remaining) fail(409, `Total pengajuan melebihi sisa pagu ${source} sebesar Rp ${remaining.toLocaleString('id-ID')}. Muat ulang pagu atau kurangi rincian.`);
            const processed = await resolveSubmissionItems(calculated, references, transaction);
            const nomor = await nextSubmissionNumber(pengajuans, req.kodeUnitKerja, unit.kode_unit, transaction);
            const record = await pengajuans.create({ nomor_pengajuan: nomor, operator_id: req.operatorId, kode_unit_kerja: req.kodeUnitKerja, total_nominal_pengajuan: total.toString(), jenis_pagu: source, pagu_id: balance.id, status: 'pending', current_position: 'pimpinan_unit', max_position: 'pimpinan_unit' }, { transaction });
            for (const item of processed) await anggarans.create({ ...item, pengajuan_id: record.pengajuan_id }, { transaction });
            const newBalance = (remaining - total).toString();
            await balance.update({ nominal_pagu: newBalance }, { transaction });
            await audit?.(req, {
                module: 'Pengajuan', action: 'AJUKAN', target: nomor,
                pengajuan_id: record.pengajuan_id, after: 'pimpinan_unit',
                note: 'Total: Rp ' + total.toLocaleString('id-ID') + ' · ' + source,
            }, transaction);
            return { msg: 'Pengajuan berhasil dikirim ke Pimpinan Unit dan saldo pagu diperbarui.', pengajuan_id: record.pengajuan_id, nomor_pengajuan: nomor, total_nominal_diajukan: total.toString(), sisa_pagu: newBalance };
        });
    };
}
