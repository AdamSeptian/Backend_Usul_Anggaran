import Suboutputs from "../models/SuboutputModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Outputs from "../models/OutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// Helper internal untuk menyisipkan nama_output secara akurat tanpa duplikasi join
const attachNamaOutput = async (suboutputData) => {
    if (!suboutputData) return null;
    
    // Ubah ke plain object jika datanya dari Sequelize Instance
    const item = suboutputData.toJSON ? suboutputData.toJSON() : suboutputData;

    // Cari nama output berdasarkan kode_output DAN kode_kegiatan secara spesifik
    const matchedOutput = await Outputs.findOne({
        where: {
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_output"]
    });

    item.output_detail = matchedOutput ? { nama_output: matchedOutput.nama_output } : { nama_output: null };
    return item;
};

// 1. Ambil semua data suboutput beserta relasinya (Dijamin bersih tanpa duplikasi)
export const getSuboutputs = async (req, res) => {
    try {
        const response = await Suboutputs.findAll({
            include: [
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });
        
        // Map untuk melampirkan nama_output secara presisi 1 per 1 data
        const results = await Promise.all(response.map(async (sub) => {
            return await attachNamaOutput(sub);
        }));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data suboutput: " + error.message });
    }
};

// 2. Ambil suboutput berdasarkan ID
export const getSuboutputById = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        const result = await attachNamaOutput(suboutput);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah suboutput + OTOMATIS ambil kode_program dari Kegiatan yang dipilih
export const createSuboutput = async (req, res) => {
    try {
        const { nama_suboutput, kode_so, kode_output, kode_kegiatan } = req.body;

        const outputExists = await MasterOutputs.findOne({ where: { kode_output } });
        if (!outputExists) {
            return res.status(404).json({ msg: "Kode output tidak ditemukan di master!" });
        }

        const transactionOutput = await Outputs.findOne({ 
            where: { kode_output, kode_kegiatan } 
        });
        if (!transactionOutput) {
            return res.status(404).json({ 
                msg: `Kombinasi Kode Output (${kode_output}) dengan Kode Kegiatan (${kode_kegiatan}) tidak ditemukan pada data Output!` 
            });
        }

        const kegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
        if (!kegiatan) {
            return res.status(404).json({ msg: "Kode kegiatan tidak ditemukan!" });
        }

        const kode_program = kegiatan.kode_program;
        if (!kode_program) {
            return res.status(400).json({ 
                msg: "Kode program pada kegiatan ini kosong! Mohon lengkapi data kegiatan terlebih dahulu." 
            });
        }

        await MasterSuboutputs.findOrCreate({
            where: { kode_so: kode_so },
            defaults: { kode_so: kode_so }
        });

        await Suboutputs.create({
            nama_suboutput,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({ 
            msg: "Suboutput berhasil ditambahkan dan Kode Program terisi otomatis!",
            kode_program_otomatis: kode_program
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update suboutput (Wajib menyertakan kode_kegiatan baru jika kode_output diubah)
// 4. Update suboutput dengan aturan validasi relasi output & kegiatan yang ketat
export const updateSuboutput = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({ where: { id: req.params.id } });
        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        const { nama_suboutput, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // 1. Kunci kode_program agar tidak diubah manual
        if (kode_program) {
            return res.status(400).json({ 
                msg: "Kode program tidak dapat diubah secara manual! Kode program akan otomatis mengikuti kode kegiatan." 
            });
        }

        let finalKodeOutput = suboutput.kode_output;
        let finalKodeKegiatan = suboutput.kode_kegiatan;
        let finalKodeProgram = suboutput.kode_program;

        // 2. SKENARIO: Jika user berniat mengubah kode_output
        const isChangingOutput = kode_output && kode_output !== suboutput.kode_output;
        const isChangingKegiatan = kode_kegiatan && kode_kegiatan !== suboutput.kode_kegiatan;

        if (isChangingOutput) {
            // Syarat: Jika ubah kode_output, wajib menyertakan kode_kegiatan juga (baik baru maupun tetap pakai yang lama)
            const targetKegiatan = kode_kegiatan || suboutput.kode_kegiatan;
            
            // Cek apakah master output-nya ada
            const outputExists = await MasterOutputs.findOne({ where: { kode_output } });
            if (!outputExists) {
                return res.status(404).json({ msg: "Kode output tujuan tidak ditemukan di master!" });
            }

            // Cek apakah kombinasi kode_output baru dan kode_kegiatan valid di tabel transaksi Outputs
            const transactionOutput = await Outputs.findOne({ 
                where: { 
                    kode_output: kode_output, 
                    kode_kegiatan: targetKegiatan 
                } 
            });

            if (!transactionOutput) {
                return res.status(400).json({ 
                    msg: `Kombinasi Kode Output (${kode_output}) tidak sesuai atau tidak terdaftar pada Kode Kegiatan (${targetKegiatan}) di tabel Output!` 
                });
            }

            finalKodeOutput = kode_output;
        }

        // 3. SKENARIO: Jika user mengubah kode_kegiatan (baik bersamaan dengan output maupun sendiri)
        if (isChangingKegiatan) {
            const kegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
            if (!kegiatan) {
                return res.status(404).json({ msg: "Kode kegiatan tujuan tidak ditemukan!" });
            }

            // Jika user mengubah kegiatan TAPI TIDAK mengubah output, kita tetap perlu memastikan 
            // apakah output yang sedang aktif saat ini valid dengan kegiatan baru tersebut
            if (!isChangingOutput) {
                const transactionOutput = await Outputs.findOne({ 
                    where: { 
                        kode_output: finalKodeOutput, 
                        kode_kegiatan: kode_kegiatan 
                    } 
                });

                if (!transactionOutput) {
                    return res.status(400).json({ 
                        msg: `Kode Kegiatan (${kode_kegiatan}) yang baru tidak sesuai dengan Kode Output (${finalKodeOutput}) yang sedang digunakan! Mohon sertakan perubahan kode output yang sesuai.` 
                    });
                }
            }

            finalKodeKegiatan = kode_kegiatan;
            finalKodeProgram = kegiatan.kode_program; // Ambil kode program otomatis dari kegiatan baru
        }

        // 4. Sinkronisasi Master Suboutput jika kode_so diubah
        if (kode_so) {
            await MasterSuboutputs.findOrCreate({
                where: { kode_so: kode_so },
                defaults: { kode_so: kode_so }
            });
        }

        // 5. Eksekusi Update ke Database
        await Suboutputs.update(
            {
                nama_suboutput: nama_suboutput || suboutput.nama_suboutput,
                kode_so: kode_so || suboutput.kode_so,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Suboutput berhasil diupdate dengan validasi relasi yang sesuai!",
            data_terbaru: {
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram
            }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus suboutput
export const deleteSuboutput = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({ where: { id: req.params.id } });
        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        await Suboutputs.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Suboutput berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};