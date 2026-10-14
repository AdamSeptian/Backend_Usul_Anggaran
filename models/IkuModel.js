import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const Ikus = db.define(
  "iku", {
    kode_iku: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    nama_iku: {
      type: DataTypes.TEXT, // Menggunakan TEXT karena deskripsi IKU cukup panjang
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    target_iku: {
      type: DataTypes.DECIMAL(5, 2), // Mendukung angka bulat maupun desimal seperti 1.25
      allowNull: false,
      validate: {
        isDecimal: true,
      },
    },
  },
  {
    freezeTableName: true,
  }
);

export default Ikus;