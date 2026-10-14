import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import Programs from "./ProgramModel.js";
import MasterPagus from "./MasterPaguModel.js";
import UnitKerjas from "./UnitKerjaModel.js";
const { DataTypes } = Sequelize;

const Pagus = db.define(
  "pagu",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    jenis_pagu: {
      type: DataTypes.STRING,
      allowNull: false,
        references: {
            model: MasterPagus,
            key: "jenis_pagu",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        validate: {
            notEmpty: true,
        },
    },
    nominal_pagu: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_unit_kerja: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: UnitKerjas,
        key: "kode_unit_kerja",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    }},
  {
    freezeTableName: true,
  }
);
Pagus.belongsTo(MasterPagus, { foreignKey: "jenis_pagu" });
MasterPagus.hasMany(Pagus, { foreignKey: "jenis_pagu" });

Pagus.belongsTo(UnitKerjas, { foreignKey: "kode_unit_kerja" });
UnitKerjas.hasMany(Pagus, { foreignKey: "kode_unit_kerja" });
export default Pagus;