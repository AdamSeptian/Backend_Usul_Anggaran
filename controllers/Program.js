import Programs from "../models/ProgramModel.js";

// 1. Ambil semua data program (Bisa diakses oleh semua role)
export const getPrograms = async (req, res) => {
    try {
        const response = await Programs.findAll({
            order: [['kode_program', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data program: " + error.message });
    }
};

// 2. Ambil data program berdasarkan kode_program (Bisa diakses oleh semua role)
export const getProgramById = async (req, res) => {
    try {
        const program = await Programs.findOne({
            where: {
                kode_program: req.params.id
            }
        });

        if (!program) {
            return res.status(404).json({ msg: "Program tidak ditemukan" });
        }

        res.status(200).json(program);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah program baru (Hanya untuk Superadmin)
export const createProgram = async (req, res) => {
    try {
        const { kode_program, nama_program } = req.body;

        // Cek apakah kode program sudah ada
        const existingProgram = await Programs.findOne({ where: { kode_program } });
        if (existingProgram) {
            return res.status(400).json({ msg: "Kode program sudah terdaftar!" });
        }

        await Programs.create({
            kode_program,
            nama_program
        });

        res.status(201).json({ msg: "Program berhasil ditambahkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update program (Hanya untuk Superadmin)
export const updateProgram = async (req, res) => {
    try {
        const program = await Programs.findOne({
            where: {
                kode_program: req.params.id
            }
        });

        if (!program) {
            return res.status(404).json({ msg: "Program tidak ditemukan" });
        }

        const { nama_program } = req.body;

        await Programs.update(
            { nama_program },
            {
                where: {
                    kode_program: req.params.id
                }
            }
        );

        res.status(200).json({ msg: "Program berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus program (Hanya untuk Superadmin)
export const deleteProgram = async (req, res) => {
    try {
        const program = await Programs.findOne({
            where: {
                kode_program: req.params.id
            }
        });

        if (!program) {
            return res.status(404).json({ msg: "Program tidak ditemukan" });
        }

        await Programs.destroy({
            where: {
                kode_program: req.params.id
            }
        });

        res.status(200).json({ msg: "Program berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};