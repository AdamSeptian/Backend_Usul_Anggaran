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