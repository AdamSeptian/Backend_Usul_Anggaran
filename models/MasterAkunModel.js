import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const MasterAkun = db.define(
  "master_akun",{
    kode_akun: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    nama_akun: {
      type: DataTypes.STRING,
      allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
},
  {
    freezeTableName: true,
  }
);
export default MasterAkun;