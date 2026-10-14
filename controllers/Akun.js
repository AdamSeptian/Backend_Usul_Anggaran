import Akuns from "../models/AkunModel.js";
import MasterAkun from "../models/MasterAkunModel.js";
import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Subkomponens from "../models/SubkomponenModel.js";
import Komponens from "../models/KomponenModel.js";
import Suboutputs from "../models/SuboutputModel.js";
import Outputs from "../models/OutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// Helper internal: sisipkan detail nama subkomponen, komponen, suboutput, dan output
const attachHierarkiDetail = async (akunData) => {
    if (!akunData) return null;

    const item = akunData.toJSON ? akunData.toJSON() : akunData;

    // 1. Subkomponen
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

    // 2. Komponen
    const matchedKomponen = await Komponens.findOne({
        where: {
            kode_komponen: item.kode_komponen,
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_komponen"]
    });

    // 3. Suboutput
    const matchedSuboutput = await Suboutputs.findOne({
        where: {
            kode_so: item.kode_so,
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_suboutput"]
    });

    // 4. Output
    const matchedOutput = await Outputs.findOne({
        where: {
            kode_output: item.kode_output,
            kode_kegiatan: item.kode_kegiatan
        },
        attributes: ["nama_output"]
    });

    item.subkomponen_detail = { nama_subkomponen: matchedSubkomponen ? matchedSubkomponen.nama_subkomponen : null };
    item.komponen_detail = { nama_komponen: matchedKomponen ? matchedKomponen.nama_komponen : null };
    item.suboutput_detail = { nama_suboutput: matchedSuboutput ? matchedSuboutput.nama_suboutput : null };
    item.output_detail = { nama_output: matchedOutput ? matchedOutput.nama_output : null };

    return item;
};

// 1. Ambil semua data akun beserta relasinya
export const getAkuns = async (req, res) => {
    try {
        const response = await Akuns.findAll({
            include: [
                { model: MasterAkun, attributes: ["kode_akun", "nama_akun"] },
                { model: MasterSubkomponens, attributes: ["kode_sk"] },
                { model: MasterSuboutputs, attributes: ["kode_so"] },
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
                { model: Programs, attributes: ["kode_program", "nama_program"] }
            ],
            order: [['id', 'ASC']]
        });

        const results = await Promise.all(response.map(async (akun) => {
            return await attachHierarkiDetail(akun);
        }));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data akun: " + error.message });
    }
};

// 2. Ambil akun berdasarkan ID
export const getAkunById = async (req, res) => {
    try {
        const akun = await Akuns.findOne({
            where: { id: req.params.id },
            include: [
                { model: MasterAkun },
                { model: MasterSubkomponens },
                { model: MasterSuboutputs },
                { model: MasterOutputs },
                { model: Kegiatans },
                { model: Programs }
            ]
        });

        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        const result = await attachHierarkiDetail(akun);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah akun + validasi hierarki Subkomponen + otomatis ambil Program + auto create Master Akun
export const createAkun = async (req, res) => {
    try {
        const { kode_akun, nama_akun, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan } = req.body;

        if (!kode_akun) {
            return res.status(400).json({ msg: "Kode akun wajib diisi!" });
        }

        // Cari subkomponen yang cocok. kode_komponen opsional: jika dikirim, ikut divalidasi
        const whereSubkomponen = { kode_sk, kode_so, kode_output, kode_kegiatan };
        if (kode_komponen) whereSubkomponen.kode_komponen = kode_komponen;

        const subkomponenTrans = await Subkomponens.findOne({ where: whereSubkomponen });

        if (!subkomponenTrans) {
            return res.status(400).json({
                msg: `Kombinasi Subkomponen (${kode_sk}), Komponen (${kode_komponen || "-"}), Suboutput (${kode_so}), Output (${kode_output}), dan Kegiatan (${kode_kegiatan}) tidak ditemukan atau tidak cocok pada data Subkomponen!`
            });
        }

        // Ambil kode_komponen & kode_program otomatis dari subkomponen yang valid
        const finalKodeKomponen = subkomponenTrans.kode_komponen;
        const kode_program = subkomponenTrans.kode_program;

        if (!finalKodeKomponen) {
            return res.status(400).json({ msg: "Kode komponen pada relasi subkomponen ini kosong!" });
        }
        if (!kode_program) {
            return res.status(400).json({ msg: "Kode program pada relasi subkomponen ini kosong!" });
        }

        // Cegah duplikasi
        const duplicate = await Akuns.findOne({
            where: { kode_akun, kode_sk, kode_komponen: finalKodeKomponen, kode_so, kode_output, kode_kegiatan }
        });
        if (duplicate) {
            return res.status(400).json({ msg: "Akun dengan kode tersebut sudah ada pada subkomponen ini!" });
        }

        // Auto create Master Akun
        const existingMaster = await MasterAkun.findOne({ where: { kode_akun } });
        if (!existingMaster) {
            if (!nama_akun) {
                return res.status(400).json({
                    msg: "Kode akun baru terdeteksi, nama akun wajib diisi untuk mendaftarkan Master Akun!"
                });
            }
            await MasterAkun.create({ kode_akun, nama_akun });
        }

        await Akuns.create({
            kode_akun,
            kode_sk,
            kode_komponen: finalKodeKomponen,
            kode_so,
            kode_output,
            kode_kegiatan,
            kode_program
        });

        res.status(201).json({
            msg: "Akun berhasil ditambahkan, Master Akun disinkronkan, serta Kode Komponen dan Kode Program terisi otomatis!",
            kode_komponen_otomatis: finalKodeKomponen,
            kode_program_otomatis: kode_program
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update akun dengan validasi ketat hierarki subkomponen
export const updateAkun = async (req, res) => {
    try {
        const akun = await Akuns.findOne({ where: { id: req.params.id } });
        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        const { kode_akun, nama_akun, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        if (kode_program) {
            return res.status(400).json({
                msg: "Kode program tidak dapat diubah secara manual! Kode program akan otomatis mengikuti hierarki subkomponen."
            });
        }

        const finalKodeSk = kode_sk || akun.kode_sk;
        const finalKodeSo = kode_so || akun.kode_so;
        const finalKodeOutput = kode_output || akun.kode_output;
        const finalKodeKegiatan = kode_kegiatan || akun.kode_kegiatan;
        const finalKodeAkun = kode_akun || akun.kode_akun;
        let finalKodeKomponen = kode_komponen || akun.kode_komponen;
        let finalKodeProgram = akun.kode_program;

        const isHierarchyChanged =
            (kode_sk && kode_sk !== akun.kode_sk) ||
            (kode_komponen && kode_komponen !== akun.kode_komponen) ||
            (kode_so && kode_so !== akun.kode_so) ||
            (kode_output && kode_output !== akun.kode_output) ||
            (kode_kegiatan && kode_kegiatan !== akun.kode_kegiatan);

        if (isHierarchyChanged) {
            const whereSubkomponen = {
                kode_sk: finalKodeSk,
                kode_so: finalKodeSo,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan
            };
            // Jika komponen dikirim eksplisit, pakai itu; jika tidak, ikuti subkomponen yang cocok
            if (kode_komponen) whereSubkomponen.kode_komponen = kode_komponen;

            const subkomponenTrans = await Subkomponens.findOne({ where: whereSubkomponen });

            if (!subkomponenTrans) {
                return res.status(400).json({
                    msg: `Kombinasi baru (Subkomponen: ${finalKodeSk}, Komponen: ${kode_komponen || "-"}, Suboutput: ${finalKodeSo}, Output: ${finalKodeOutput}, Kegiatan: ${finalKodeKegiatan}) tidak valid atau tidak cocok di tabel Subkomponen!`
                });
            }

            finalKodeKomponen = subkomponenTrans.kode_komponen;
            finalKodeProgram = subkomponenTrans.kode_program;
        }

        // Sinkronkan master akun jika kode_akun diubah
        // Sinkronkan Master Akun (buat baru jika belum ada, atau update nama jika berubah)
        const existingMaster = await MasterAkun.findOne({ where: { kode_akun: finalKodeAkun } });

        if (!existingMaster) {
            if (!nama_akun) {
                return res.status(400).json({
                    msg: "Kode akun baru terdeteksi, nama akun wajib diisi untuk mendaftarkan Master Akun!"
                });
            }
            await MasterAkun.create({ kode_akun: finalKodeAkun, nama_akun });
        } else if (nama_akun && nama_akun !== existingMaster.nama_akun) {
            await MasterAkun.update(
                { nama_akun },
                { where: { kode_akun: finalKodeAkun } }
            );
        }

        await Akuns.update(
            {
                kode_akun: finalKodeAkun,
                kode_sk: finalKodeSk,
                kode_komponen: finalKodeKomponen,
                kode_so: finalKodeSo,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
                kode_program: finalKodeProgram,
            },
            { where: { id: req.params.id } }
        );

        const masterTerbaru = await MasterAkun.findOne({ where: { kode_akun: finalKodeAkun } });

        res.status(200).json({
            msg: "Akun berhasil diupdate dengan validasi hierarki yang sesuai!",
            data_terbaru: {
                kode_akun: finalKodeAkun,
                nama_akun: masterTerbaru ? masterTerbaru.nama_akun : null,
                kode_sk: finalKodeSk,
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

// 5. Hapus akun
export const deleteAkun = async (req, res) => {
    try {
        const akun = await Akuns.findOne({ where: { id: req.params.id } });
        if (!akun) {
            return res.status(404).json({ msg: "Data akun tidak ditemukan" });
        }

        await Akuns.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Data akun berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// controller lama (mengubah nama akun di master akun)
// import Akuns from "../models/AkunModel.js";
// import MasterAkun from "../models/MasterAkunModel.js";
// import MasterSubkomponens from "../models/MasterSubkomponenModel.js";
// import MasterSuboutputs from "../models/MasterSuboutputModel.js";
// import MasterOutputs from "../models/MasterOutputModel.js";
// import Subkomponens from "../models/SubkomponenModel.js";
// import Komponens from "../models/KomponenModel.js";
// import Suboutputs from "../models/SuboutputModel.js";
// import Outputs from "../models/OutputModel.js";
// import Kegiatans from "../models/KegiatanModel.js";
// import Programs from "../models/ProgramModel.js";

// // Helper internal: sisipkan detail nama subkomponen, komponen, suboutput, dan output
// const attachHierarkiDetail = async (akunData) => {
//     if (!akunData) return null;

//     const item = akunData.toJSON ? akunData.toJSON() : akunData;

//     // 1. Subkomponen
//     const matchedSubkomponen = await Subkomponens.findOne({
//         where: {
//             kode_sk: item.kode_sk,
//             kode_komponen: item.kode_komponen,
//             kode_so: item.kode_so,
//             kode_output: item.kode_output,
//             kode_kegiatan: item.kode_kegiatan
//         },
//         attributes: ["nama_subkomponen"]
//     });

//     // 2. Komponen
//     const matchedKomponen = await Komponens.findOne({
//         where: {
//             kode_komponen: item.kode_komponen,
//             kode_so: item.kode_so,
//             kode_output: item.kode_output,
//             kode_kegiatan: item.kode_kegiatan
//         },
//         attributes: ["nama_komponen"]
//     });

//     // 3. Suboutput
//     const matchedSuboutput = await Suboutputs.findOne({
//         where: {
//             kode_so: item.kode_so,
//             kode_output: item.kode_output,
//             kode_kegiatan: item.kode_kegiatan
//         },
//         attributes: ["nama_suboutput"]
//     });

//     // 4. Output
//     const matchedOutput = await Outputs.findOne({
//         where: {
//             kode_output: item.kode_output,
//             kode_kegiatan: item.kode_kegiatan
//         },
//         attributes: ["nama_output"]
//     });

//     item.subkomponen_detail = { nama_subkomponen: matchedSubkomponen ? matchedSubkomponen.nama_subkomponen : null };
//     item.komponen_detail = { nama_komponen: matchedKomponen ? matchedKomponen.nama_komponen : null };
//     item.suboutput_detail = { nama_suboutput: matchedSuboutput ? matchedSuboutput.nama_suboutput : null };
//     item.output_detail = { nama_output: matchedOutput ? matchedOutput.nama_output : null };

//     return item;
// };

// // 1. Ambil semua data akun beserta relasinya
// export const getAkuns = async (req, res) => {
//     try {
//         const response = await Akuns.findAll({
//             include: [
//                 { model: MasterAkun, attributes: ["kode_akun", "nama_akun"] },
//                 { model: MasterSubkomponens, attributes: ["kode_sk"] },
//                 { model: MasterSuboutputs, attributes: ["kode_so"] },
//                 { model: MasterOutputs, attributes: ["kode_output"] },
//                 { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan"] },
//                 { model: Programs, attributes: ["kode_program", "nama_program"] }
//             ],
//             order: [['id', 'ASC']]
//         });

//         const results = await Promise.all(response.map(async (akun) => {
//             return await attachHierarkiDetail(akun);
//         }));

//         res.status(200).json(results);
//     } catch (error) {
//         res.status(500).json({ msg: "Gagal mengambil data akun: " + error.message });
//     }
// };

// // 2. Ambil akun berdasarkan ID
// export const getAkunById = async (req, res) => {
//     try {
//         const akun = await Akuns.findOne({
//             where: { id: req.params.id },
//             include: [
//                 { model: MasterAkun },
//                 { model: MasterSubkomponens },
//                 { model: MasterSuboutputs },
//                 { model: MasterOutputs },
//                 { model: Kegiatans },
//                 { model: Programs }
//             ]
//         });

//         if (!akun) {
//             return res.status(404).json({ msg: "Data akun tidak ditemukan" });
//         }

//         const result = await attachHierarkiDetail(akun);
//         res.status(200).json(result);
//     } catch (error) {
//         res.status(500).json({ msg: error.message });
//     }
// };

// // 3. Tambah akun + validasi hierarki Subkomponen + otomatis ambil Program + auto create Master Akun
// export const createAkun = async (req, res) => {
//     try {
//         const { kode_akun, nama_akun, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan } = req.body;

//         if (!kode_akun) {
//             return res.status(400).json({ msg: "Kode akun wajib diisi!" });
//         }

//         // Cari subkomponen yang cocok. kode_komponen opsional: jika dikirim, ikut divalidasi
//         const whereSubkomponen = { kode_sk, kode_so, kode_output, kode_kegiatan };
//         if (kode_komponen) whereSubkomponen.kode_komponen = kode_komponen;

//         const subkomponenTrans = await Subkomponens.findOne({ where: whereSubkomponen });

//         if (!subkomponenTrans) {
//             return res.status(400).json({
//                 msg: `Kombinasi Subkomponen (${kode_sk}), Komponen (${kode_komponen || "-"}), Suboutput (${kode_so}), Output (${kode_output}), dan Kegiatan (${kode_kegiatan}) tidak ditemukan atau tidak cocok pada data Subkomponen!`
//             });
//         }

//         // Ambil kode_komponen & kode_program otomatis dari subkomponen yang valid
//         const finalKodeKomponen = subkomponenTrans.kode_komponen;
//         const kode_program = subkomponenTrans.kode_program;

//         if (!finalKodeKomponen) {
//             return res.status(400).json({ msg: "Kode komponen pada relasi subkomponen ini kosong!" });
//         }
//         if (!kode_program) {
//             return res.status(400).json({ msg: "Kode program pada relasi subkomponen ini kosong!" });
//         }

//         // Cegah duplikasi
//         const duplicate = await Akuns.findOne({
//             where: { kode_akun, kode_sk, kode_komponen: finalKodeKomponen, kode_so, kode_output, kode_kegiatan }
//         });
//         if (duplicate) {
//             return res.status(400).json({ msg: "Akun dengan kode tersebut sudah ada pada subkomponen ini!" });
//         }

//         // Auto create Master Akun
//         const existingMaster = await MasterAkun.findOne({ where: { kode_akun } });
//         if (!existingMaster) {
//             if (!nama_akun) {
//                 return res.status(400).json({
//                     msg: "Kode akun baru terdeteksi, nama akun wajib diisi untuk mendaftarkan Master Akun!"
//                 });
//             }
//             await MasterAkun.create({ kode_akun, nama_akun });
//         }

//         await Akuns.create({
//             kode_akun,
//             kode_sk,
//             kode_komponen: finalKodeKomponen,
//             kode_so,
//             kode_output,
//             kode_kegiatan,
//             kode_program
//         });

//         res.status(201).json({
//             msg: "Akun berhasil ditambahkan, Master Akun disinkronkan, serta Kode Komponen dan Kode Program terisi otomatis!",
//             kode_komponen_otomatis: finalKodeKomponen,
//             kode_program_otomatis: kode_program
//         });
//     } catch (error) {
//         res.status(500).json({ msg: error.message });
//     }
// };

// // 4. Update akun dengan validasi ketat hierarki subkomponen
// export const updateAkun = async (req, res) => {
//     try {
//         const akun = await Akuns.findOne({ where: { id: req.params.id } });
//         if (!akun) {
//             return res.status(404).json({ msg: "Data akun tidak ditemukan" });
//         }

//         const { kode_akun, nama_akun, kode_sk, kode_komponen, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

//         if (kode_program) {
//             return res.status(400).json({
//                 msg: "Kode program tidak dapat diubah secara manual! Kode program akan otomatis mengikuti hierarki subkomponen."
//             });
//         }

//         const finalKodeSk = kode_sk || akun.kode_sk;
//         const finalKodeSo = kode_so || akun.kode_so;
//         const finalKodeOutput = kode_output || akun.kode_output;
//         const finalKodeKegiatan = kode_kegiatan || akun.kode_kegiatan;
//         const finalKodeAkun = kode_akun || akun.kode_akun;
//         let finalKodeKomponen = kode_komponen || akun.kode_komponen;
//         let finalKodeProgram = akun.kode_program;

//         const isHierarchyChanged =
//             (kode_sk && kode_sk !== akun.kode_sk) ||
//             (kode_komponen && kode_komponen !== akun.kode_komponen) ||
//             (kode_so && kode_so !== akun.kode_so) ||
//             (kode_output && kode_output !== akun.kode_output) ||
//             (kode_kegiatan && kode_kegiatan !== akun.kode_kegiatan);

//         if (isHierarchyChanged) {
//             const whereSubkomponen = {
//                 kode_sk: finalKodeSk,
//                 kode_so: finalKodeSo,
//                 kode_output: finalKodeOutput,
//                 kode_kegiatan: finalKodeKegiatan
//             };
//             // Jika komponen dikirim eksplisit, pakai itu; jika tidak, ikuti subkomponen yang cocok
//             if (kode_komponen) whereSubkomponen.kode_komponen = kode_komponen;

//             const subkomponenTrans = await Subkomponens.findOne({ where: whereSubkomponen });

//             if (!subkomponenTrans) {
//                 return res.status(400).json({
//                     msg: `Kombinasi baru (Subkomponen: ${finalKodeSk}, Komponen: ${kode_komponen || "-"}, Suboutput: ${finalKodeSo}, Output: ${finalKodeOutput}, Kegiatan: ${finalKodeKegiatan}) tidak valid atau tidak cocok di tabel Subkomponen!`
//                 });
//             }

//             finalKodeKomponen = subkomponenTrans.kode_komponen;
//             finalKodeProgram = subkomponenTrans.kode_program;
//         }

//         // Sinkronkan master akun jika kode_akun diubah
//         if (kode_akun && kode_akun !== akun.kode_akun) {
//             const existingMaster = await MasterAkun.findOne({ where: { kode_akun } });
//             if (!existingMaster) {
//                 if (!nama_akun) {
//                     return res.status(400).json({
//                         msg: "Kode akun baru terdeteksi, nama akun wajib diisi untuk mendaftarkan Master Akun!"
//                     });
//                 }
//                 await MasterAkun.create({ kode_akun, nama_akun });
//             }
//         }

//         await Akuns.update(
//             {
//                 kode_akun: finalKodeAkun,
//                 kode_sk: finalKodeSk,
//                 kode_komponen: finalKodeKomponen,
//                 kode_so: finalKodeSo,
//                 kode_output: finalKodeOutput,
//                 kode_kegiatan: finalKodeKegiatan,
//                 kode_program: finalKodeProgram,
//             },
//             { where: { id: req.params.id } }
//         );

//         res.status(200).json({
//             msg: "Akun berhasil diupdate dengan validasi hierarki yang sesuai!",
//             data_terbaru: {
//                 kode_akun: finalKodeAkun,
//                 kode_sk: finalKodeSk,
//                 kode_komponen: finalKodeKomponen,
//                 kode_so: finalKodeSo,
//                 kode_output: finalKodeOutput,
//                 kode_kegiatan: finalKodeKegiatan,
//                 kode_program: finalKodeProgram
//             }
//         });
//     } catch (error) {
//         res.status(500).json({ msg: error.message });
//     }
// };

// // 5. Hapus akun
// export const deleteAkun = async (req, res) => {
//     try {
//         const akun = await Akuns.findOne({ where: { id: req.params.id } });
//         if (!akun) {
//             return res.status(404).json({ msg: "Data akun tidak ditemukan" });
//         }

//         await Akuns.destroy({ where: { id: req.params.id } });

//         res.status(200).json({ msg: "Data akun berhasil dihapus" });
//     } catch (error) {
//         res.status(500).json({ msg: error.message });
//     }
// };