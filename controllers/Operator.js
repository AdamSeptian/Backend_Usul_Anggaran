import Operators from "../models/OperatorModel.js";
import UnitKerjas from "../models/UnitKerjaModel.js";
import Pengajuans from "../models/PengajuanModel.js";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { Op } from "sequelize"; // <-- Tambahkan Op untuk pengecekan email saat update

// Helper: validasi kode unit kerja & kecocokan nama unit kerja
const normalisasi = (teks) => String(teks).trim().replace(/\s+/g, " ").toLowerCase();

const validasiUnitKerja = async (kode_unit_kerja, unit_kerja) => {
    const unit = await UnitKerjas.findOne({ where: { kode_unit_kerja } });

    if (!unit) {
        return {
            error: {
                status: 404,
                msg: `Unit kerja dengan kode ${kode_unit_kerja} tidak ditemukan di tabel unit kerja!`
            }
        };
    }

    if (unit_kerja && normalisasi(unit_kerja) !== normalisasi(unit.unit_kerja)) {
        return {
            error: {
                status: 400,
                msg: `Nama unit kerja tidak cocok! Kode unit kerja ${kode_unit_kerja} terdaftar sebagai "${unit.unit_kerja}", bukan "${unit_kerja}".`
            }
        };
    }

    return { unit };
};

// 1. Ambil semua data operator
export const getOperators = async (req, res) => {
    try {
        const response = await Operators.findAll({
            attributes: ["id", "email", "role", "nama_operator", "kode_unit_kerja"],
            include: [{
                model: UnitKerjas,
                attributes: ["kode_unit_kerja", "unit_kerja"]
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
                attributes: ["kode_unit_kerja", "unit_kerja"]
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
        const { email, password, confPassword, role, kode_unit_kerja, unit_kerja, nama_operator } = req.body;

        if (password !== confPassword) {
            return res.status(400).json({ msg: "Password dan Konfirmasi Password tidak cocok!" });
        }

        // Cek duplikasi email saat create
        const existingEmail = await Operators.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ msg: "Email sudah digunakan oleh operator lain!" });
        }

        if ((role === "operator" || role === "pimpinan_unit") && !kode_unit_kerja) {
            return res.status(400).json({ msg: "Operator Unit dan Pimpinan Unit wajib memilih Unit Kerja!" });
        }

        // Validasi kode unit kerja + ambil nama unit kerja otomatis
        let unitTerisi = null;
        if (kode_unit_kerja) {
            const hasil = await validasiUnitKerja(kode_unit_kerja, unit_kerja);
            if (hasil.error) {
                return res.status(hasil.error.status).json({ msg: hasil.error.msg });
            }
            unitTerisi = hasil.unit;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await Operators.create({
            email,
            password: hashedPassword,
            role,
            kode_unit_kerja: kode_unit_kerja || null,
            nama_operator
        });

        res.status(201).json({
            msg: "Operator berhasil ditambahkan",
            data: {
                nama_operator,
                email,
                role,
                kode_unit_kerja: kode_unit_kerja || null,
                unit_kerja: unitTerisi ? unitTerisi.unit_kerja : null
            }
        });
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

        const { email, password, confPassword, role, kode_unit_kerja, unit_kerja, nama_operator } = req.body;

        // PENGKONDISIAN CEK DUPLIKASI EMAIL SAAT UPDATE
        if (email && email !== operator.email) {
            const existingEmail = await Operators.findOne({ 
                where: { 
                    email: email, 
                    id: { [Op.ne]: req.params.id } // Kecualikan ID operator yang sedang diedit
                } 
            });
            if (existingEmail) {
                return res.status(400).json({ msg: "Email sudah digunakan oleh operator lain!" });
            }
        }

        let hashPassword = operator.password;
        if (password && password !== "") {
            if (password !== confPassword) {
                return res.status(400).json({ msg: "Password dan Konfirmasi Password tidak cocok!" });
            }
            hashPassword = await bcrypt.hash(password, 10);
        }

        const finalKodeUnit = kode_unit_kerja !== undefined ? kode_unit_kerja : operator.kode_unit_kerja;

        // Validasi unit kerja bila kode diisi (atau nama dikirim untuk dicocokkan)
        let unitTerisi = null;
        if (finalKodeUnit) {
            const hasil = await validasiUnitKerja(finalKodeUnit, unit_kerja);
            if (hasil.error) {
                return res.status(hasil.error.status).json({ msg: hasil.error.msg });
            }
            unitTerisi = hasil.unit;
        }

        await Operators.update(
            {
                email: email || operator.email,
                password: hashPassword,
                role: role || operator.role,
                kode_unit_kerja: finalKodeUnit,
                nama_operator: nama_operator || operator.nama_operator
            },
            { where: { id: req.params.id } }
        );

        res.status(200).json({
            msg: "Data operator berhasil diupdate",
            data: {
                email: email || operator.email,
                nama_operator: nama_operator || operator.nama_operator,
                role: role || operator.role,
                kode_unit_kerja: finalKodeUnit,
                unit_kerja: unitTerisi ? unitTerisi.unit_kerja : null
            }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
};

// 5. Hapus operator (Hanya Superadmin)
export const deleteOperator = async (req, res) => {
    try {
        await Operators.sequelize.transaction(async transaction => {
            const operator = await Operators.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!operator) throw Object.assign(new Error("Operator tidak ditemukan"), { status: 404 });
            if (String(req.operatorId) === String(operator.id)) {
                throw Object.assign(new Error("Anda tidak dapat menghapus akun yang sedang digunakan saat ini!"), { status: 400 });
            }
            const submission = await Pengajuans.findOne({
                where: { operator_id: operator.id }, attributes: ["pengajuan_id"],
                transaction, lock: transaction.LOCK.UPDATE,
            });
            if (submission) {
                throw Object.assign(new Error("Akun masih memiliki pengajuan dan tidak dapat dihapus."), { status: 409 });
            }
            await operator.destroy({ transaction });
        });
        res.status(200).json({ msg: "Operator berhasil dihapus" });
    } catch (error) {
        res.status(error.status || 500).json({ msg: error.message });
    }
};

// 6. Login Operator
export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const operator = await Operators.findOne({ where: { email } });
        if (!operator) {
            return res.status(404).json({ msg: "Akun dengan email tersebut tidak ditemukan!" });
        }

        const match = await bcrypt.compare(password, operator.password);
        if (!match) {
            return res.status(400).json({ msg: "Kata sandi salah!" });
        }

        req.session.operatorId = operator.id;

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

// 7. Cek User yang Sedang Login
export const Me = async (req, res) => {
    try {
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