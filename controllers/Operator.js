import Operators from "../models/OperatorModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";

// 1. Ambil semua data operator (Hanya bisa dilihat oleh superadmin atau role tertentu sesuai kebutuhan)
export const getOperators = async (req, res) => {
    try {
        const response = await Operators.findAll({
            attributes: ["id", "email", "role", "nama_operator", "kode_unit_kerja"],
            include: [{
                model: UnitKerjas,
                attributes: ["kode_unit_kerja", "nama_unit_kerja"]
            }],
            order: [['id', 'ASC']]
        });
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ msg: "Gagal mengambil data operator: " + error.message });
    }
};

// 2. Ambil data operator berdasarkan ID
export const getOperatorById = async (req, res) => {
    try {
        const operator = await Operators.findOne({
            where: { id: req.params.id },
            attributes: ["id", "email", "role", "nama_operator", "kode_unit_kerja"],
            include: [{
                model: UnitKerjas,
                attributes: ["kode_unit_kerja", "nama_unit_kerja"]
            }]
        });

        if (!operator) {
            return res.status(404).json({ msg: "Operator tidak ditemukan" });
        }

        res.status(200).json(operator);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 3. Tambah operator baru (Hanya Superadmin)
export const createOperator = async (req, res) => {
    try {
        const { email, password, confPassword, role, kode_unit_kerja, nama_operator } = req.body;

        // Validasi konfirmasi password
        if (password !== confPassword) {
            return res.status(400).json({ msg: "Password dan Konfirmasi Password tidak cocok!" });
        }

        // Cek email apakah sudah terdaftar
        const existingEmail = await Operators.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ msg: "Email sudah digunakan oleh operator lain!" });
        }

        // Validasi khusus role: Jika operator_unit atau pimpinan_unit, wajib punya kode_unit_kerja
        if ((role === "operator_unit" || role === "pimpinan_unit") && !kode_unit_kerja) {
            return res.status(400).json({ msg: "Operator Unit dan Pimpinan Unit wajib memilih Unit Kerja!" });
        }

        // Hash password menggunakan bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await Operators.create({
            email,
            password: hashedPassword,
            role,
            kode_unit_kerja: kode_unit_kerja || null,
            nama_operator
        });

        res.status(201).json({ msg: "Operator berhasil ditambahkan" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 4. Update data operator (Hanya Superadmin atau akun sendiri)
export const updateOperator = async (req, res) => {
    try {
        const operator = await Operators.findOne({ where: { id: req.params.id } });
        if (!operator) {
            return res.status(404).json({ msg: "Operator tidak ditemukan" });
        }

        const { email, password, confPassword, role, kode_unit_kerja, nama_operator } = req.body;

        let hashPassword = operator.password; // Default pakai password lama
        if (password && password !== "") {
            if (password !== confPassword) {
                return res.status(400).json({ msg: "Password dan Konfirmasi Password tidak cocok!" });
            }
            const saltRounds = 10;
            hashPassword = await bcrypt.hash(password, saltRounds);
        }

        await Operators.update(
            {
                email: email || operator.email,
                password: hashPassword,
                role: role || operator.role,
                kode_unit_kerja: kode_unit_kerja !== undefined ? kode_unit_kerja : operator.kode_unit_kerja,
                nama_operator: nama_operator || operator.nama_operator
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({ msg: "Data operator berhasil diupdate" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus operator (Hanya Superadmin)
export const deleteOperator = async (req, res) => {
    try {
        const operator = await Operators.findOne({ where: { id: req.params.id } });
        if (!operator) {
            return res.status(404).json({ msg: "Operator tidak ditemukan" });
        }

        // Pencegahan agar superadmin utama tidak menghapus dirinya sendiri
        if (req.operatorId === operator.id) {
            return res.status(400).json({ msg: "Anda tidak dapat menghapus akun yang sedang digunakan saat ini!" });
        }

        await Operators.destroy({ where: { id: req.params.id } });

        res.status(200).json({ msg: "Operator berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Cari operator berdasarkan email
        const operator = await Operators.findOne({ where: { email } });
        if (!operator) {
            return res.status(404).json({ msg: "Akun dengan email tersebut tidak ditemukan!" });
        }

        // Cocokkan password menggunakan bcrypt
        const match = await bcrypt.compare(password, operator.password);
        if (!match) {
            return res.status(400).json({ msg: "Kata sandi salah!" });
        }

        // Set Session (Cadangan)
        req.session.operatorId = operator.id;

        // Generate JWT Access Token (Masa berlaku 1 hari, pastikan ACCESS_TOKEN_SECRET ada di .env)
        const accessToken = jwt.sign(
            { 
                id: operator.id, 
                email: operator.email, 
                role: operator.role, 
                kode_unit_kerja: operator.kode_unit_kerja 
            }, 
            process.env.ACCESS_TOKEN_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({
            msg: "Login Berhasil",
            accessToken,
            data: {
                id: operator.id,
                nama_operator: operator.nama_operator,
                email: operator.email,
                role: operator.role,
                kode_unit_kerja: operator.kode_unit_kerja
            }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 7. Cek User yang Sedang Login (Menampilkan profil dari token/session aktif)
export const Me = async (req, res) => {
    try {
        // req.operatorId sudah otomatis terisi oleh middleware verifyUser
        const operator = await Operators.findOne({
            where: { id: req.operatorId },
            attributes: ["id", "nama_operator", "email", "role", "kode_unit_kerja"],
            include: [{
                model: UnitKerjas,
                attributes: ["kode_unit_kerja", "unit_kerja"]
            }]
        });

        if (!operator) {
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }

        res.status(200).json(operator);
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 8. Logout Operator
export const Logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(400).json({ msg: "Tidak dapat melakukan logout" });
        }
        res.status(200).json({ msg: "Berhasil keluar dari akun (Logout)" });
    });
};