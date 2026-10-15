import Anggarans from "../models/AnggaranModel.js";
import Pengajuans from "../models/PengajuanModel.js";
import MasterSatuans from "../models/MasterSatuanModel.js";
import MasterAkun from "../models/MasterAkunModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";
import Akuns from "../models/AkunModel.js";
import Subkomponens from "../models/SubkomponenModel.js";
import Komponens from "../models/KomponenModel.js";
import Suboutputs from "../models/SuboutputModel.js";
import Outputs from "../models/OutputModel.js";

// Helper internal untuk menyisipkan detail nama hierarki secara presisi tanpa duplikasi
const attachAnggaranHierarkiDetail = async (anggaranData) => {
    if (!anggaranData) return null;
    
    const item = anggaranData.toJSON ? anggaranData.toJSON() : anggaranData;

    // 1. Cari nama_akun dari MasterAkun
    const matchedMasterAkun = await MasterAkun.findOne({
        where: { kode_akun: item.kode_akun },
        attributes: ["nama_akun"]
    });

    // 2. Cari nama_subkomponen
    const matchedSubkomponen = await Subkomponens.findOne({
        where: {
            kode_sk: item.kode_sk,
            kode_komponen: item.kode_komponen,
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_subkomponen"]
    });

    // 3. Cari nama_komponen
    const matchedKomponen = await Komponens.findOne({
        where: {
            kode_komponen: item.kode_komponen,
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_komponen"]
    });

    // 4. Cari nama_suboutput
    const matchedSuboutput = await Suboutputs.findOne({
        where: {
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_suboutput"]
    });

    // 5. Cari nama_output
    const matchedOutput = await Outputs.findOne({
        where: {
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_output"]
    });

    item.master_akun = matchedMasterAkun ? { kode_akun: item.kode_akun, nama_akun: matchedMasterAkun.nama_akun } : { kode_akun: item.kode_akun, nama_akun: null };
    item.subkomponen_detail = { nama_subkomponen: matchedSubkomponen ? matchedSubkomponen.nama_subkomponen : null };
    item.komponen_detail = { nama_komponen: matchedKomponen ? matchedKomponen.nama_komponen : null };
    item.suboutput_detail = { nama_suboutput: matchedSuboutput ? matchedSuboutput.nama_suboutput : null };
    item.output_detail = { nama_output: matchedOutput ? matchedOutput.nama_output : null };
    
    return item;
};

// 1. Ambil semua rincian anggaran (Bisa difilter berdasarkan pengajuan_id via query params)
export const getAnggarans = async (req, res) => {
    try {
        const { pengajuan_id } = req.query;
        let condition = {};
        if (pengajuan_id) {
            condition = { pengajuan_id };
        }

        const response = await Anggarans.findAll({
            where: condition,
            include: [
                { model: Pengajuans, attributes: ["nomor_pengajuan", "status", "current_position"] },
                { model: MasterSatuans, attributes: ["kode_satuan", "nama_satuan"] },
                { model: MasterAkun, attributes: ["kode_akun", "nama_akun"] },
                { model: MasterSubkomponens, attributes: ["kode_sk"] },
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });

        const results = await Promise.all(response.map(async (item) => {
            return await attachAnggaranHierarkiDetail(item);
        }));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data rincian anggaran: " + error.message });
    }
};

// 2. Ambil rincian anggaran berdasarkan ID item
export const getAnggaranById = async (req, res) => {
    try {
        const anggaran = await Anggarans.findOne({
            where: { id: req.params.id },
            include: [
                { model: Pengajuans },
                { model: MasterSatuans },
                { model: MasterAkun },
                { model: MasterSubkomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!anggaran) {
            return res.status(404).json({ msg: "Item rincian anggaran tidak ditemukan" });
        }

        const result = await attachAnggaranHierarkiDetail(anggaran);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah rincian item anggaran baru (Memperbaiki pencarian pengajuan_id)
export const createAnggaranItem = async (req, res) => {
    try {
        const {
            pengajuan_id,
            volume,
            kode_satuan,
            nama_satuan,
            nominal_satuan,
            kode_akun,
            kode_sk,
            kode_komponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            nama_item,
            kode_iku,
            target_iku,
            jenis_pagu,
            nominal_pagu,
            stat_revisi
        } = req.body;

        // PERBAIKAN UTAMA: Gunakan { pengajuan_id } sesuai primary key tabel Pengajuans
        const pengajuan = await Pengajuans.findOne({ where: { pengajuan_id } });
        if (!pengajuan) {
            return res.status(404).json({ msg: "Nomor pengajuan induk tidak ditemukan!" });
        }

        if (pengajuan.status !== 'draft' && pengajuan.status !== 'revision') {
            return res.status(403).json({ msg: "Pengajuan sudah diproses atau disetujui, item anggaran tidak dapat ditambahkan." });
        }

        // Validasi & Ambil hierarki otomatis dari tabel Akuns
        const whereAkun = { kode_akun };
        if (kode_sk) whereAkun.kode_sk = kode_sk;
        if (kode_komponen) whereAkun.kode_komponen = kode_komponen;
        if (kode_so) whereAkun.kode_so = kode_so;
        if (kode_output) whereAkun.kode_output = kode_output;
        if (kode_kegiatan) whereAkun.kode_kegiatan = kode_kegiatan;

        const akunTrans = await Akuns.findOne({ where: whereAkun });
        if (!akunTrans) {
            return res.status(400).json({ 
                msg: `Kombinasi Akun (${kode_akun}) dengan hierarki terkait tidak ditemukan pada data transaksi Akun!` 
            });
        }

        const finalKodeSk = akunTrans.kode_sk;
        const finalKodeKomponen = akunTrans.kode_komponen;
        const finalKodeSo = akunTrans.kode_so;
        const finalKodeOutput = akunTrans.kode_output;
        const finalKodeKegiatan = akunTrans.kode_kegiatan;
        const finalKodeProgram = akunTrans.kode_program;

        // Auto-create Master Satuan jika belum ada
        if (kode_satuan) {
            await MasterSatuans.findOrCreate({
                where: { kode_satuan },
                defaults: { nama_satuan: nama_satuan || kode_satuan }
            });
        }

        const total_nominal = Number(volume) * Number(nominal_satuan);

        const newAnggaran = await Anggarans.create({
            pengajuan_id,
            nama_item: nama_item || null,
            volume,
            kode_satuan,
            nominal_satuan,
            total_nominal,
            kode_akun,
            kode_sk: finalKodeSk,
            kode_komponen: finalKodeKomponen,
            kode_so: finalKodeSo,
            kode_output: finalKodeOutput,
            kode_kegiatan: finalKodeKegiatan,
            kode_program: finalKodeProgram,
            kode_iku: kode_iku || null,
            target_iku: target_iku || null,
            jenis_pagu: jenis_pagu || null,
            nominal_pagu: nominal_pagu || null,
            stat_revisi: stat_revisi || null
        });

        res.status(201).json({ 
            msg: "Item rincian anggaran berhasil ditambahkan dengan hierarki otomatis!", 
            data: newAnggaran 
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update rincian item anggaran
export const updateAnggaranItem = async (req, res) => {
    try {
        const anggaran = await Anggarans.findOne({
            where: { id: req.params.id },
            include: [{ model: Pengajuans }]
        });

        if (!anggaran) {
            return res.status(404).json({ msg: "Item rincian anggaran tidak ditemukan" });
        }

        if (anggaran.pengajuan.status !== 'draft' && anggaran.pengajuan.status !== 'revision') {
            return res.status(403).json({ msg: "Pengajuan sedang berjalan atau selesai, item tidak dapat diubah." });
        }

        const {
            volume,
            kode_satuan,
            nama_satuan,
            nominal_satuan,
            kode_akun,
            kode_sk,
            kode_komponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            nama_item,
            kode_iku,
            target_iku,
            jenis_pagu,
            nominal_pagu,
            stat_revisi
        } = req.body;

        if (kode_satuan) {
            await MasterSatuans.findOrCreate({
                where: { kode_satuan },
                defaults: { nama_satuan: nama_satuan || kode_satuan }
            });
        }

        let finalKodeAkun = kode_akun || anggaran.kode_akun;
        let finalKodeSk = anggaran.kode_sk;
        let finalKodeKomponen = anggaran.kode_komponen;
        let finalKodeSo = anggaran.kode_so;
        let finalKodeOutput = anggaran.kode_output;
        let finalKodeKegiatan = anggaran.kode_kegiatan;
        let finalKodeProgram = anggaran.kode_program;

        const isAkunOrHierarchyChanged = (kode_akun && kode_akun !== anggaran.kode_akun) || kode_sk || kode_komponen || kode_so || kode_output || kode_kegiatan;

        if (isAkunOrHierarchyChanged) {
            const whereAkun = { kode_akun: finalKodeAkun };
            if (kode_sk) whereAkun.kode_sk = kode_sk;
            if (kode_komponen) whereAkun.kode_komponen = kode_komponen;
            if (kode_so) whereAkun.kode_so = kode_so;
            if (kode_output) whereAkun.kode_output = kode_output;
            if (kode_kegiatan) whereAkun.kode_kegiatan = kode_kegiatan;

            const akunTrans = await Akuns.findOne({ where: whereAkun });
            if (!akunTrans) {
                return res.status(400).json({ 
                    msg: "Kombinasi Akun dan hierarki baru tidak valid atau tidak cocok pada data transaksi Akun!" 
                });
            }

            finalKodeSk = akunTrans.kode_sk;
            finalKodeKomponen = akunTrans.kode_komponen;
            finalKodeSo = akunTrans.kode_so;
            finalKodeOutput = akunTrans.kode_output;
            finalKodeKegiatan = akunTrans.kode_kegiatan;
            finalKodeProgram = akunTrans.kode_program;
        }

        const vol = volume !== undefined ? volume : anggaran.volume;
        const nom = nominal_satuan !== undefined ? nominal_satuan : anggaran.nominal_satuan;
        const total_nominal = Number(vol) * Number(nom);

        await Anggarans.update(
            {
                nama_item: nama_item !== undefined ? nama_item : anggaran.nama_item,
                volume: vol,
                kode_satuan: kode_satuan || anggaran.kode_satuan,
                nominal_satuan: nom,
                total_nominal,
                kode_akun: finalKodeAkun,
                kode_sk: finalKodeSk,
                kode_komponen: finalKodeKomponen,
                kode_so: finalKodeSo,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram,
                kode_iku: kode_iku !== undefined ? kode_iku : anggaran.kode_iku,
                target_iku: target_iku !== undefined ? target_iku : anggaran.target_iku,
                jenis_pagu: jenis_pagu !== undefined ? jenis_pagu : anggaran.jenis_pagu,
                nominal_pagu: nominal_pagu !== undefined ? nominal_pagu : anggaran.nominal_pagu,
                stat_revisi: stat_revisi !== undefined ? stat_revisi : anggaran.stat_revisi,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Item rincian anggaran berhasil diupdate dengan hierarki yang disesuaikan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus rincian item anggaran
export const deleteAnggaranItem = async (req, res) => {
    try {
        const anggaran = await Anggarans.findOne({
            where: { id: req.params.id },
            include: [{ model: Pengajuans }]
        });

        if (!anggaran) {
            return res.status(404).json({ msg: "Item rincian anggaran tidak ditemukan" });
        }

        if (anggaran.pengajuan.status !== 'draft' && anggaran.pengajuan.status !== 'revision') {
            return res.status(403).json({ msg: "Pengajuan sudah diproses, item anggaran tidak dapat dihapus." });
        }

        await Anggarans.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Item rincian anggaran berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};