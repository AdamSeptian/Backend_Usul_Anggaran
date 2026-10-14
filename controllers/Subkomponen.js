import Subkomponens from "../models/SubkomponenModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
import MasterKomponens from "../models/MasterKomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Komponens from "../models/KomponenModel.js";
import Suboutputs from "../models/SuboutputModel.js";
import Outputs from "../models/OutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// Helper internal untuk menyisipkan detail nama komponen, suboutput, dan output secara akurat
const attachHierarkiDetail = async (subkomponenData) => {
    if (!subkomponenData) return null;
    
    const item = subkomponenData.toJSON ? subkomponenData.toJSON() : subkomponenData;

    // 1. Cari nama_komponen dari tabel komponens (jika ada relasi spesifik atau master)
    // Berhubung komponen punya kode_komponen, kode_so, kode_output, kode_kegiatan:
    const matchedKomponen = await Komponens.findOne({
        where: {
            kode_komponen: item.kode_komponen,
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_komponen"]
    });

    // 2. Cari nama_suboutput dari tabel suboutputs
    const matchedSuboutput = await Suboutputs.findOne({
        where: {
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_suboutput"]
    });

    // 3. Cari nama_output dari tabel outputs
    const matchedOutput = await Outputs.findOne({
        where: {
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_output"]
    });

    item.komponen_detail = matchedKomponen ? { nama_komponen: matchedKomponen.nama_komponen } : { nama_komponen: null };
    item.suboutput_detail = matchedSuboutput ? { nama_suboutput: matchedSuboutput.nama_suboutput } : { nama_suboutput: null };
    item.output_detail = matchedOutput ? { nama_output: matchedOutput.nama_output } : { nama_output: null };
    
    return item;
};

// 1. Ambil semua data subkomponen beserta relasinya
export const getSubkomponens = async (req, res) => {
    try {
        const response = await Subkomponens.findAll({
            include: [
                { model: MasterSubkomponens, attributes: ["kode_sk"] },
                { model: MasterKomponens, attributes: ["kode_komponen"] },
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });

        const results = await Promise.all(response.map(async (sk) => {
            return await attachHierarkiDetail(sk);
        }));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data subkomponen: " + error.message });
    }
};

// 2. Ambil subkomponen berdasarkan ID
export const getSubkomponenById = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterSubkomponens },
                { model: MasterKomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        const result = await attachHierarkiDetail(subkomponen);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah subkomponen + Validasi hierarki Komponen & Otomatis ambil Program
export const createSubkomponen = async (req, res) => {
    try {
        const { nama_subkomponen, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan } = req.body;

        // Validasi: Pastikan kombinasi hierarki di bawahnya (Komponen) benar-benar ada dan cocok di tabel Komponens
        const komponenTrans = await Komponens.findOne({
            where: {
                kode_komponen: kode_komponen,
                kode_so: kode_so,
                kode_output: kode_output,
                kode_kegiatan: kode_kegiatan
            }
        });

        if (!komponenTrans) {
            return res.status(400).json({ 
                msg: `Kombinasi Komponen (${kode_komponen}), Suboutput (${kode_so}), Output (${kode_output}), dan Kegiatan (${kode_kegiatan}) tidak ditemukan atau tidak cocok pada data Komponen!` 
            });
        }

        // Ambil kode_program secara otomatis dari data komponen yang valid
        const kode_program = komponenTrans.kode_program;
        if (!kode_program) {
            return res.status(400).json({ msg: "Kode program pada relasi komponen ini kosong!" });
        }

        // --- FITUR UTAMA: AUTO CREATE MASTER SUBKOMPONEN ---
        await MasterSubkomponens.findOrCreate({
            where: { kode_sk: kode_sk },
            defaults: { kode_sk: kode_sk }
        });

        // Simpan data transaksi subkomponen
        await Subkomponens.create({
            nama_subkomponen,
            kode_sk,
            kode_komponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ 
            msg: "Subkomponen berhasil ditambahkan, Master Subkomponen disinkronkan, dan Kode Program terisi otomatis!",
            kode_program_otomatis: kode_program
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update subkomponen dengan validasi ketat hierarki komponen
export const updateSubkomponen = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({ where: { id: req.params.id } });
        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        const { nama_subkomponen, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Kunci kode_program agar tidak bisa diubah secara manual
        if (kode_program) {
            return res.status(400).json({ 
                msg: "Kode program tidak dapat diubah secara manual! Kode program akan otomatis mengikuti hierarki komponen." 
            });
        }

        let finalKodeKomponen = kode_komponen || subkomponen.kode_komponen;
        let finalKodeSo = kode_so || subkomponen.kode_so;
        let finalKodeOutput = kode_output || subkomponen.kode_output;
        let finalKodeKegiatan = kode_kegiatan || subkomponen.kode_kegiatan;
        let finalKodeProgram = subkomponen.kode_program;

        // Cek apakah ada perubahan pada atribut hierarkinya
        const isHierarchyChanged = 
            (kode_komponen && kode_komponen !== subkomponen.kode_komponen) ||
            (kode_so && kode_so !== subkomponen.kode_so) || 
            (kode_output && kode_output !== subkomponen.kode_output) || 
            (kode_kegiatan && kode_kegiatan !== subkomponen.kode_kegiatan);

        if (isHierarchyChanged) {
            // Wajib validasi kecocokan kombinasi baru ke tabel Komponens
            const komponenTrans = await Komponens.findOne({
                where: {
                    kode_komponen: finalKodeKomponen,
                    kode_so: finalKodeSo,
                    kode_output: finalKodeOutput,
                    kode_kegiatan: finalKodeKegiatan
                }
            });

            if (!komponenTrans) {
                return res.status(400).json({ 
                    msg: `Kombinasi baru (Komponen: ${finalKodeKomponen}, Suboutput: ${finalKodeSo}, Output: ${finalKodeOutput}, Kegiatan: ${finalKodeKegiatan}) tidak valid atau tidak cocok di tabel Komponen!` 
                });
            }

            // Ambil ulang kode_program yang sesuai secara otomatis dari data komponen baru
            finalKodeProgram = komponenTrans.kode_program;
        }

        // Jika kode_sk diubah/diisi, sinkronkan ke master subkomponen
        if (kode_sk) {
            await MasterSubkomponens.findOrCreate({
                where: { kode_sk: kode_sk },
                defaults: { kode_sk: kode_sk }
            });
        }

        await Subkomponens.update(
            {
                nama_subkomponen: nama_subkomponen || subkomponen.nama_subkomponen,
                kode_sk: kode_sk || subkomponen.kode_sk,
                kode_komponen: finalKodeKomponen,
                kode_so: finalKodeSo,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Subkomponen berhasil diupdate dengan validasi hierarki yang sesuai!",
            data_terbaru: {
                kode_sk: kode_sk || subkomponen.kode_sk,
                kode_komponen: finalKodeKomponen,
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

// 5. Hapus subkomponen
export const deleteSubkomponen = async (req, res) => {
    try {
        const subkomponen = await Subkomponens.findOne({ where: { id: req.params.id } });
        if (!subkomponen) {
            return res.status(404).json({ msg: "Subkomponen tidak ditemukan" });
        }

        await Subkomponens.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Subkomponen berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};