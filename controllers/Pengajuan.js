import Pengajuans from "./../models/PengajuanModel.js";
import Anggarans from "../models/AnggaranModel.js";
import MasterSatuans from "../models/MasterSatuanModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js";
import Operators from "../models/OperatorModel.js";

// 1. Ambil daftar pengajuan (Filter berdasarkan role)
export const getPengajuans = async (req, res) => {
    try {
        let condition = {};
        if (req.role === "operator_unit") {
            condition = { kode_unit_kerja: req.kodeUnitKerja };
        } else if (req.role === "pimpinan_unit") {
            condition = { kode_unit_kerja: req.kodeUnitKerja, current_position: "pimpinan_unit" };
        } else if (req.role === "tim_sakip") {
            condition = { current_position: "tim_sakip" };
        } else if (req.role === "spi") {
            condition = { current_position: "spi" };
        } else if (req.role === "kpa") {
            condition = { current_position: "kpa" };
        }

        const response = await Pengajuans.findAll({
            where: condition,
            include: [
                { model: UnitKerjas, attributes: ["nama_unit_kerja"] },
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

// 2. Buat Pengajuan Baru beserta Item Rincian Anggarannya (Oleh Operator Unit)
export const createPengajuan = async (req, res) => {
    try {
        const { nomor_pengajuan, items } = req.body;

        const pengajuan = await Pengajuans.create({
            nomor_pengajuan,
            operator_id: req.operatorId,
            kode_unit_kerja: req.kodeUnitKerja,
            status: "pending",
            current_position: "pimpinan_unit"
        });

        if (items && items.length > 0) {
            for (const item of items) {
                await MasterSatuans.findOrCreate({
                    where: { kode_satuan: item.kode_satuan },
                    defaults: { nama_satuan: item.nama_satuan || item.kode_satuan }
                });

                await Anggarans.create({
                    pengajuan_id: pengajuan.pengajuan_id,
                    volume: item.volume,
                    kode_satuan: item.kode_satuan,
                    nominal_satuan: item.nominal_satuan,
                    total_nominal: item.volume * item.nominal_satuan,
                    kode_akun: item.kode_akun,
                    kode_sk: item.kode_sk,
                    kode_so: item.kode_so,
                    kode_output: item.kode_output,
                    kode_kegiatan: item.kode_kegiatan,
                    kode_program: item.kode_program,
                });
            }
        }

        res.status(201).json({ msg: "Pengajuan anggaran berhasil dikirim ke Pimpinan Unit." });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Alur Verifikasi Bertingkat (Maju & Mundur Bertahap + Catatan Revisi)
export const verifyPengajuan = async (req, res) => {
    try {
        // action: 'approve' atau 'revise' (atau 'reject')
        // catatan_revisi: string catatan dari verifikator
        const { action, catatan_revisi } = req.body; 
        const pengajuan = await Pengajuans.findOne({ where: { pengajuan_id: req.params.id } });

        if (!pengajuan) return res.status(404).json({ msg: "Pengajuan tidak ditemukan" });

        let nextPosition = pengajuan.current_position;
        let newStatus = pengajuan.status;

        // --- SKenario 1: DISETUJUI (MAJU SATU TINGKAT) ---
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
        
        // --- SKENARIO 2: DIREVISI / DITOLAK (MUNDUR SATU TINGKAT SECARA BERTAHAP) ---
        else if (action === "revise" || action === "reject") {
            newStatus = "revision";

            if (pengajuan.current_position === "tim_sakip" && req.role === "tim_sakip") {
                // Jika Tim SAKIP menolak/minta revisi, kembalikan ke Pimpinan Unit untuk dicek ulang
                nextPosition = "pimpinan_unit";
            } else if (pengajuan.current_position === "spi" && req.role === "spi") {
                // Jika SPI menolak/minta revisi, kembalikan ke Tim SAKIP
                nextPosition = "tim_sakip";
            } else if (pengajuan.current_position === "kpa" && req.role === "kpa") {
                // Jika KPA menolak/minta revisi, kembalikan ke SPI
                nextPosition = "spi";
            } else if (pengajuan.current_position === "pimpinan_unit" && req.role === "pimpinan_unit") {
                // Jika Pimpinan Unit menolak, baru kembalikan langsung ke Operator Unit
                nextPosition = "operator"; // Sesuai enum awal
            } else {
                return res.status(403).json({ msg: "Akses ditolak untuk merevisi pengajuan ini." });
            }

            if (!catatan_revisi) {
                return res.status(400).json({ msg: "Catatan revisi wajib diisi jika pengajuan dikembalikan/ditolak." });
            }
        } else {
            return res.status(400).json({ msg: "Aksi (action) tidak valid!" });
        }

        // Simpan perubahan ke database
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