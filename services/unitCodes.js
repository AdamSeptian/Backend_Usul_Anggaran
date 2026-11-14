const officialCodes = [
    ['A', /^(bagian perencanaan keuangan dan umum|bpku)$/],
    ['B', /^(bagian akademik dan kemahasiswaan|bak)$/],
    ['C', /^(pusat penelitian dan pengabdian kepada masyarakat|p3m)$/],
    ['D', /^(pusat penjaminan mutu dan pengembangan pembelajaran|p2mpp)$/],
    ['E', /^jurusan teknik$/],
    ['F', /^jurusan teknik informatika$/],
    ['G', /^jurusan kesehatan$/],
    ['H', /^upa (teknologi informasi dan komunikasi|tik)$/],
    ['I', /^upa (perawatan dan perbaikan|pp)$/],
    ['J', /^upa (pengembangan karier dan kewirausahaan|pengembangan karir dan kewirausahaan|pkk)$/],
    ['K', /^upa (perpustakaan|perpus)$/],
    ['L', /^upa (layanan uji kompetensi|lauk)$/],
    ['M', /^upa bahasa$/],
    ['N', /^upa (laboratorium terpadu|lt)$/],
    ['O', /^(satuan pengawas internal|spi)$/],
];

export function officialUnitCode(name) {
    const normalized = name.toLowerCase().replace(/\([^)]*\)/g, '').replaceAll('&', ' dan ')
        .replaceAll(',', ' ').trim().replace(/\s+/g, ' ');
    return officialCodes.find(([, pattern]) => pattern.test(normalized))?.[0];
}

export async function fillOfficialUnitCodes(units) {
    const records = await units.findAll();
    const used = new Set(records.map(unit => unit.kode_unit));
    for (const unit of records) {
        if (unit.kode_unit) continue;
        const code = officialUnitCode(unit.unit_kerja);
        if (!code || used.has(code)) continue;
        await unit.update({ kode_unit: code });
        used.add(code);
    }
}
