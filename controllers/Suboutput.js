import Suboutputs from "../models/SuboutputModel.js";
import MasterSuboutputs from "../models/MasterSuboutputModel.js";
import MasterOutputs from "../models/MasterOutputModel.js";
import Outputs from "../models/OutputModel.js";
import Kegiatans from "../models/KegiatanModel.js";
import Programs from "../models/ProgramModel.js";

// Helper internal untuk menyisipkan nama_output secara akurat berdasarkan kode_output
const attachNamaOutput = async (suboutputData) => {
    if (!suboutputData) return null;
    
    // Ubah ke plain object jika datanya dari Sequelize Instance
    const item = suboutputData.toJSON ? suboutputData.toJSON() : suboutputData;

    // Cari nama output dari tabel Outputs berdasarkan kode_output
    const matchedOutput = await Outputs.findOne({
        where: {
            kode_output: item.kode_output
        },
        attributes: ["nama_output"]
    });

    item.output_detail = matchedOutput ? { nama_output: matchedOutput.nama_output } : { nama_output: null };
    return item;
};

// 1. Ambil semua data suboutput beserta relasinya
export const getSuboutputs = async (req, res) => {
    try {
        const response = await Suboutputs.findAll({
            include: [
                { model: MasterSuboutputs }, // MasterSuboutputs hanya punya kode_so, ambil semua
                { model: MasterOutputs, attributes: ["kode_output"] },
                { model: Kegiatans, attributes: ["kode_kegiatan", "nama_kegiatan", "kode_program"],
                    include: [{ model: Programs, attributes: ["kode_program", "nama_program"] }] 
                }
            ],
            order: [['id', 'ASC']]
        });
        
        // Map untuk melampirkan nama_output secara presisi
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
                { 
                    model: Kegiatans,
                    include: [{ model: Programs }] 
                }
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

// 3. Tambah suboutput
export const createSuboutput = async (req, res) => {
    try {
        const { nama_suboutput, kode_so, kode_output, kode_kegiatan } = req.body;

        // Validasi keberadaan Master Output
        const outputExists = await MasterOutputs.findOne({ where: { kode_output } });
        if (!outputExists) {
            return res.status(404).json({ msg: "Kode output tidak ditemukan di master!" });
        }

        // Validasi keberadaan Kegiatan
        const kegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
        if (!kegiatan) {
            return res.status(404).json({ msg: "Kode kegiatan tidak ditemukan!" });
        }

        // Sinkronisasi Master Suboutput otomatis jika belum ada
        await MasterSuboutputs.findOrCreate({
            where: { kode_so: kode_so },
            defaults: { kode_so: kode_so }
        });

        // Simpan data suboutput
        const newSuboutput = await Suboutputs.create({
            nama_suboutput,
            kode_so,
            kode_output,
            kode_kegiatan
        });

        res.status(201).json({ 
            msg: "Suboutput berhasil ditambahkan dan disinkronkan!",
            data: newSuboutput
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update suboutput dengan validasi relasi baru
export const updateSuboutput = async (req, res) => {
    try {
        const suboutput = await Suboutputs.findOne({ where: { id: req.params.id } });
        if (!suboutput) {
            return res.status(404).json({ msg: "Suboutput tidak ditemukan" });
        }

        const { nama_suboutput, kode_so, kode_output, kode_kegiatan, kode_program } = req.body;

        // Karena kode_program sudah dihapus dari model Suboutputs, tolak jika dikirim manual
        if (kode_program) {
            return res.status(400).json({ 
                msg: "Kode program tidak lagi disimpan di tabel suboutput dan diatur melalui relasi kegiatan." 
            });
        }

        let finalKodeOutput = suboutput.kode_output;
        let finalKodeKegiatan = suboutput.kode_kegiatan;

        // Jika kode_output diubah, validasi ke Master Outputs
        if (kode_output && kode_output !== suboutput.kode_output) {
            const outputExists = await MasterOutputs.findOne({ where: { kode_output } });
            if (!outputExists) {
                return res.status(404).json({ msg: "Kode output tujuan tidak ditemukan di master!" });
            }
            finalKodeOutput = kode_output;
        }

        // Jika kode_kegiatan diubah, validasi ke tabel Kegiatans
        if (kode_kegiatan && kode_kegiatan !== suboutput.kode_kegiatan) {
            const kegiatan = await Kegiatans.findOne({ where: { kode_kegiatan } });
            if (!kegiatan) {
                return res.status(404).json({ msg: "Kode kegiatan tujuan tidak ditemukan!" });
            }
            finalKodeKegiatan = kode_kegiatan;
        }

        // Sinkronisasi Master Suboutput jika kode_so diubah/diberikan
        if (kode_so) {
            await MasterSuboutputs.findOrCreate({
                where: { kode_so: kode_so },
                defaults: { kode_so: kode_so }
            });
        }

        // Eksekusi Update ke Database
        await Suboutputs.update(
            {
                nama_suboutput: nama_suboutput || suboutput.nama_suboutput,
                kode_so: kode_so || suboutput.kode_so,
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan,
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ 
            msg: "Suboutput berhasil diupdate!",
            data_terbaru: {
                kode_output: finalKodeOutput,
                kode_kegiatan: finalKodeKegiatan
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