import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import UnitKerjas from "./UnitKerjaModel.js";
const { DataTypes } = Sequelize;

const Operators = db.define(
  "operator",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
      validate: {
        notEmpty: true,
      },
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_unit_kerja: {
        type: DataTypes.INTEGER,
        references: {
            model: UnitKerjas,
            key: "kode_unit_kerja",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
    },
    nama_operator: {
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
Operators.belongsTo(UnitKerjas, { foreignKey: "kode_unit_kerja" });
UnitKerjas.hasMany(Operators, { foreignKey: "kode_unit_kerja" });

export default Operators;