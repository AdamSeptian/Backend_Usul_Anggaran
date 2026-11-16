import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Outputs from "./OutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import MasterSuboutputs from "./MasterSuboutputModel.js";
const { DataTypes } = Sequelize;

const Suboutputs = db.define(
  "suboutput",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    nama_suboutput: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_so: {
      type: DataTypes.STRING,
      allowNull: false,
        references: {
            model: MasterSuboutputs,
            key: "kode_so",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    }},
  {
    freezeTableName: true,
  }
);

Suboutputs.belongsTo(MasterSuboutputs, { foreignKey: "kode_so" });
MasterSuboutputs.hasMany(Suboutputs, { foreignKey: "kode_so" });

Suboutputs.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Suboutputs, { foreignKey: "kode_output" });

Suboutputs.belongsTo(Outputs, { 
    as: "output_detail",
    foreignKey: "kode_output",
    targetKey: "kode_output",
    constraints: false
});

Suboutputs.belongsTo(Kegiatans, { foreignKey: "kode_kegiatan" });
Kegiatans.hasMany(Suboutputs, { foreignKey: "kode_kegiatan" });

export default Suboutputs;