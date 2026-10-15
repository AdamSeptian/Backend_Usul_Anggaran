import Pengajuans from "./../models/PengajuanModel.js";
import Anggarans from "../models/AnggaranModel.js";
import MasterSatuans from "../models/MasterSatuanModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js";
import Operators from "../models/OperatorModel.js";
import Pagus from "../models/PaguModel.js";
import { Op } from "sequelize";

// 1. Ambil daftar pengajuan (Terisolasi ketat berdasarkan unit kerja & role)
export const getPengajuans = async (req, res) => {
    try {
        let condition = {};

        if (req.role === "operator_unit" || req.role === "operator") {
            condition = { kode_unit_kerja: req.kodeUnitKerja };
        } 
        else if (req.role === "pimpinan_unit") {
            condition = {
                kode_unit_kerja: req.kodeUnitKerja,
                current_position: {
                    [Op.in]: ["pimpinan_unit", "tim_sakip", "spi", "kpa", "completed", "revision"]
                }
            };
        } 
        else if (req.role === "tim_sakip") {
            condition = { current_position: { [Op.in]: ["tim_sakip", "spi", "kpa", "completed", "revision"] } };
        } 
        else if (req.role === "spi") {
            condition = { current_position: { [Op.in]: ["spi", "kpa", "completed", "revision"] } };
        } 
        else if (req.role === "kpa") {
            condition = { current_position: { [Op.in]: ["kpa", "completed", "revision"] } };
        } 
        else {
            return res.status(403).json({ msg: "Akses ditolak: Role tidak valid." });
        }

        const response = await Pengajuans.findAll({
            where: condition,
            include: [
                { model: UnitKerjas, attributes: ["unit_kerja"] },
                { model: Operators, attributes: ["nama_operator", "email"] },
                { model: Anggarans }
            ],
            order: [['pengajuan_id', 'DESC']]
        });
        
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 2. Buat Pengajuan Baru beserta Item Rincian Anggarannya (Dengan Validasi Pagu & Rekap Total)
export const createPengajuan = async (req, res) => {
    try {
        const { nomor_pengajuan, jenis_pagu, items } = req.body; 

        if (!items || items.length === 0) {
            return res.status(400).json({ msg: "Item rincian anggaran tidak boleh kosong!" });
        }

        // A. Hitung total keseluruhan nominal anggaran dari item-item yang disubmit (volume * nominal_satuan)
        let totalPengajuanNominal = 0;
        const processedItems = items.map(item => {
            const volume = Number(item.volume) || 0;
            const nominalSatuan = Number(item.nominal_satuan) || 0;
            const totalNominalItem = volume * nominalSatuan;
            
            totalPengajuanNominal += totalNominalItem;

            return {
                ...item,
                total_nominal: totalNominalItem
            };
        });

        // B. Cek ketersediaan pagu untuk unit kerja yang sedang login berdasarkan jenis pagunya
        const paguUnit = await Pagus.findOne({
            where: { 
                kode_unit_kerja: req.kodeUnitKerja,
                jenis_pagu: jenis_pagu || "PNBP" // Default ke PNBP jika tidak dikirim
            }
        });

        if (!paguUnit) {
            return res.status(404).json({ 
                msg: `Rejection: Alokasi pagu untuk jenis '${jenis_pagu || "PNBP"}' tidak ditemukan pada unit kerja Anda.` 
            });
        }

        // C. Validasi apakah total usulan melebihi pagu yang tersedia (Rejection Message)
        if (totalPengajuanNominal > Number(paguUnit.nominal_pagu)) {
            return res.status(400).json({ 
                status: "error",
                msg: `Rejection: Pengajuan ditolak! Total anggaran yang diajukan (Rp ${totalPengajuanNominal.toLocaleString('id-ID')}) melebihi sisa pagu tersedia (Rp ${Number(paguUnit.nominal_pagu).toLocaleString('id-ID')}).` 
            });
        }

        // D. Buat data pengajuan induk beserta rekapitulasi total nominalnya
        const pengajuan = await Pengajuans.create({
            nomor_pengajuan,
            operator_id: req.operatorId,
            kode_unit_kerja: req.kodeUnitKerja,
            total_nominal_pengajuan: totalPengajuanNominal, // Rekap hasil hitung total
            status: "pending",
            current_position: "pimpinan_unit"
        });

        // E. Simpan item-item anggaran ke tabel Anggaran
        for (const item of processedItems) {
            await MasterSatuans.findOrCreate({
                where: { kode_satuan: item.kode_satuan },
                defaults: { nama_satuan: item.nama_satuan || item.kode_satuan }
            });

            await Anggarans.create({
                pengajuan_id: pengajuan.pengajuan_id,
                volume: item.volume,
                kode_satuan: item.kode_satuan,
                nominal_satuan: item.nominal_satuan,
                total_nominal: item.total_nominal, // Hasil volume * nominal_satuan
                kode_akun: item.kode_akun,
                kode_sk: item.kode_sk,
                kode_komponen: item.kode_komponen,
                kode_so: item.kode_so,
                kode_output: item.kode_output,
                kode_kegiatan: item.kode_kegiatan,
                kode_program: item.kode_program,
                kode_iku: item.kode_iku || null,
                target_iku: item.target_iku || null,
                jenis_pagu: jenis_pagu || item.jenis_pagu || null,
                nominal_pagu: paguUnit.nominal_pagu,
                stat_revisi: item.stat_revisi || null
            });
        }

        // F. Kurangi nominal pagu unit kerja secara otomatis sesuai total anggaran yang diajukan
        const sisaPaguBaru = Number(paguUnit.nominal_pagu) - totalPengajuanNominal;
        await paguUnit.update({ nominal_pagu: sisaPaguBaru });

        res.status(201).json({ 
            msg: "Pengajuan anggaran berhasil dikirim dan pagu unit kerja telah diperbarui.",
            total_nominal_diajukan: totalPengajuanNominal,
            sisa_pagu: sisaPaguBaru
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Alur Verifikasi Bertingkat
export const verifyPengajuan = async (req, res) => {
    try {
        const { action, catatan_revisi } = req.body;  
        const pengajuan = await Pengajuans.findOne({ where: { pengajuan_id: req.params.id } });

        if (!pengajuan) {
            return res.status(404).json({ msg: "Pengajuan tidak ditemukan" });
        }

        if (req.role === "pimpinan_unit" && pengajuan.kode_unit_kerja !== req.kodeUnitKerja) {
            return res.status(403).json({ msg: "Akses ditolak: Anda tidak berhak memverifikasi pengajuan dari unit kerja lain." });
        }

        let nextPosition = pengajuan.current_position;
        let newStatus = pengajuan.status;

        if (action === "approve") {
            if (pengajuan.current_position === "pimpinan_unit" && req.role === "pimpinan_unit") {
                nextPosition = "tim_sakip";
            } else if (pengajuan.current_position === "tim_sakip" && req.role === "tim_sakip") {
                nextPosition = "spi";
            } else if (pengajuan.current_position === "spi" && req.role === "spi") {
                nextPosition = "kpa";
            } else if (pengajuan.current_position === "kpa" && req.role === "kpa") {
                nextPosition = "completed";
                newStatus = "approved";
            } else {
                return res.status(403).json({ msg: "Anda tidak memiliki hak verifikasi pada tahap posisi ini." });
            }
        } 
        else if (action === "revise" || action === "reject") {
            newStatus = "revision";

            if (pengajuan.current_position === "tim_sakip" && req.role === "tim_sakip") {
                nextPosition = "pimpinan_unit";
            } else if (pengajuan.current_position === "spi" && req.role === "spi") {
                nextPosition = "tim_sakip";
            } else if (pengajuan.current_position === "kpa" && req.role === "kpa") {
                nextPosition = "spi";
            } else if (pengajuan.current_position === "pimpinan_unit" && req.role === "pimpinan_unit") {
                nextPosition = "operator"; 
            } else {
                return res.status(403).json({ msg: "Akses ditolak untuk merevisi pengajuan ini." });
            }

            if (!catatan_revisi) {
                return res.status(400).json({ msg: "Catatan revisi wajib diisi jika pengajuan dikembalikan/ditolak." });
            }
        } else {
            return res.status(400).json({ msg: "Aksi (action) tidak valid!" });
        }

        await pengajuan.update({
            current_position: nextPosition,
            status: newStatus,
            catatan_revisi: catatan_revisi || pengajuan.catatan_revisi
        });

        res.status(200).json({ 
            msg: `Pengajuan berhasil diproses. Posisi saat ini berada di: ${nextPosition}`,
            status: newStatus 
        });

    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};