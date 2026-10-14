import Komponens from "../models/KomponenModel.js";
import MasterKomponens from "../models/MasterKomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Suboutputs from "../models/SuboutputModel.js";
import Outputs from "../models/OutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// Helper internal untuk menyisipkan nama_suboutput dan nama_output secara akurat
const attachHierarkiDetail = async (komponenData) => {
    if (!komponenData) return null;
    
    const item = komponenData.toJSON ? komponenData.toJSON() : komponenData;

    // 1. Cari detail nama_suboutput dari tabel suboutputs berdasarkan kode_so, kode_output, dan kode_kegiatan
    const matchedSuboutput = await Suboutputs.findOne({
        where: {
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_suboutput"]
    });

    // 2. Cari detail nama_output dari tabel outputs berdasarkan kode_output dan kode_kegiatan
    const matchedOutput = await Outputs.findOne({
        where: {
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_output"]
    });

    item.suboutput_detail = matchedSuboutput ? { nama_suboutput: matchedSuboutput.nama_suboutput } : { nama_suboutput: null };
    item.output_detail = matchedOutput ? { nama_output: matchedOutput.nama_output } : { nama_output: null };
    
    return item;
};

// 1. Ambil semua data komponen beserta relasinya
export const getKomponens = async (req, res) => {
    try {
        const response = await Komponens.findAll({
            include: [
                { model: MasterKomponens, attributes: ["kode_komponen"] },
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });

        const results = await Promise.all(response.map(async (komp) => {
            return await attachHierarkiDetail(komp);
        }));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data komponen: " + error.message });
    }
};

// 2. Ambil komponen berdasarkan ID
export const getKomponenById = async (req, res) => {
    try {
        const komponen = await Komponens.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterKomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!komponen) {
            return res.status(404).json({ msg: "Komponen tidak ditemukan" });
        }

        const result = await attachHierarkiDetail(komponen);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah komponen + Validasi hierarki Suboutput & Otomatis ambil Program
export const createKomponen = async (req, res) => {
    try {
        const { nama_komponen, kode_komponen, kode_so, kode_output, kode_kegiatan } = req.body;

        // Validasi: Pastikan kombinasi kode_so, kode_output, dan kode_kegiatan valid di tabel Suboutputs
        const suboutputTrans = await Suboutputs.findOne({
            where: {
                kode_so: kode_so,
                kode_output: kode_output,
                kode_kegiatan: kode_kegiatan
            }
        });

        if (!suboutputTrans) {
            return res.status(400).json({ 
                msg: `Kombinasi Suboutput (${kode_so}), Output (${kode_output}), dan Kegiatan (${kode_kegiatan}) tidak ditemukan atau tidak cocok pada data Suboutput!` 
            });
        }

        // Ambil kode_program secara otomatis dari data suboutput/kegiatan yang valid
        const kode_program = suboutputTrans.kode_program;
        if (!kode_program) {
            return res.status(400).json({ msg: "Kode program pada relasi suboutput ini kosong!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER KOMPONEN ---
        await MasterKomponens.findOrCreate({
            where: { kode_komponen: kode_komponen },
            defaults: { kode_komponen: kode_komponen }
        });

        // Simpan data transaksi komponen
        await Komponens.create({
            nama_komponen,
            kode_komponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ 
            msg: "Komponen berhasil ditambahkan, Master Komponen disinkronkan, dan Kode Program terisi otomatis!",
            kode_program_otomatis: kode_program
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update komponen dengan validasi ketat hierarki suboutput
export const updateKomponen = async (req, res) => {
    try {
        const komponen = await Komponens.findOne({ where: { id: req.params.id } });
        if (!komponen) {
            return res.status(404).json({ msg: "Komponen tidak ditemukan" });
        }

        const { nama_komponen, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Kunci kode_program agar tidak bisa diubah manual
        if (kode_program) {
            return res.status(400).json({ 
                msg: "Kode program tidak dapat diubah secara manual! Kode program akan otomatis mengikuti hierarki suboutput/kegiatan." 
            });
        }

        let finalKodeSo = kode_so || komponen.kode_so;
        let finalKodeOutput = kode_output || komponen.kode_output;
        let finalKodeKegiatan = kode_kegiatan || komponen.kode_kegiatan;
        let finalKodeProgram = komponen.kode_program;

        // Jika ada perubahan pada atribut hierarki (kode_so, kode_output, atau kode_kegiatan)
        const isHierarchyChanged = 
            (kode_so && kode_so !== komponen.kode_so) || 
            (kode_output && kode_output !== komponen.kode_output) || 
            (kode_kegiatan && kode_kegiatan !== komponen.kode_kegiatan);

        if (isHierarchyChanged) {
            // Wajib validasi kecocokan kombinasi baru ke tabel Suboutputs
            const suboutputTrans = await Suboutputs.findOne({
                where: {
                    kode_so: finalKodeSo,
                    kode_output: finalKodeOutput,
                    kode_kegiatan: finalKodeKegiatan
                }
            });

            if (!suboutputTrans) {
                return res.status(400).json({ 
                    msg: `Kombinasi baru (Suboutput: ${finalKodeSo}, Output: ${finalKodeOutput}, Kegiatan: ${finalKodeKegiatan}) tidak valid atau tidak cocok di tabel Suboutput!` 
                });
            }

            // Ambil ulang kode_program yang sesuai secara otomatis
            finalKodeProgram = suboutputTrans.kode_program;
        }

        // Jika kode_komponen diubah/diisi, sinkronkan ke master komponen
        if (kode_komponen) {
            await MasterKomponens.findOrCreate({
                where: { kode_komponen: kode_komponen },
                defaults: { kode_komponen: kode_komponen }
            });
        }

        await Komponens.update(
            {
                nama_komponen: nama_komponen || komponen.nama_komponen,
                kode_komponen: kode_komponen || komponen.kode_komponen,
                kode_so: finalKodeSo,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Komponen berhasil diupdate dengan validasi hierarki yang sesuai!",
            data_terbaru: {
                kode_so: finalKodeSo,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram
            }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus komponen
export const deleteKomponen = async (req, res) => {
    try {
        const komponen = await Komponens.findOne({ where: { id: req.params.id } });
        if (!komponen) {
            return res.status(404).json({ msg: "Komponen tidak ditemukan" });
        }

        await Komponens.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Komponen berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};