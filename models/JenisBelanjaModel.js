import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const JenisBelanjas = db.define(
  "jenis_belanja",{
    kode_jenis_belanja: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    jenis_belanja: {
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
export default JenisBelanjas;