import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const UnitKerjas = db.define(
  "unit_kerja",{
    kode_unit_kerja: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    kode_unit: { type: DataTypes.STRING(1), allowNull: true, unique: "unit_kerja_kode_unit_unique" },
    unit_kerja: {
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
export default UnitKerjas;