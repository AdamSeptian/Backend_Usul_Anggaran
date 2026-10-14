import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import Programs from "./ProgramModel.js";
const { DataTypes } = Sequelize;

const Outputs = db.define(
  "output",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    nama_output: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_output: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: MasterOutputs,
        key: "kode_output",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    kode_kegiatan: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Kegiatans,
        key: "kode_kegiatan",
      },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    },},
  {
    freezeTableName: true,
  }
);
Outputs.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Outputs, { foreignKey: "kode_output" });

Outputs.belongsTo(Kegiatans, { foreignKey: "kode_kegiatan" });
Kegiatans.hasMany(Outputs, { foreignKey: "kode_kegiatan" });

Outputs.belongsTo(Programs, { foreignKey: "kode_program" });
Programs.hasMany(Outputs, { foreignKey: "kode_program" });

export default Outputs;