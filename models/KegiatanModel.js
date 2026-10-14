import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import Programs from "./ProgramModel.js";
const { DataTypes } = Sequelize;

const Kegiatans = db.define(
  "kegiatan",{
    kode_kegiatan: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    kode_program: {
        type: DataTypes.STRING,
      allowNull: false,
        references: {
            model: Programs,
            key: "kode_program",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      validate: {
        notEmpty: true,
      },
    },
    nama_kegiatan: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    }},
  {
    freezeTableName: true,
  }
);
Kegiatans.belongsTo(Programs, { foreignKey: "kode_program" });
Programs.hasMany(Kegiatans, { foreignKey: "kode_program" });

export default Kegiatans;