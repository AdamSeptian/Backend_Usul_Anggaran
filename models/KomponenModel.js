import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import Programs from "./ProgramModel.js";
import MasterSuboutputs from "./MasterSuboutputModel.js";
import MasterKomponens from "./MasterKomponenModel.js";
const { DataTypes } = Sequelize;

const Komponens = db.define(
  "komponen",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    nama_komponen: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_komponen: {
      type: DataTypes.STRING,
      allowNull: false,
        references: {
            model: MasterKomponens,
            key: "kode_komponen",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
Komponens.belongsTo(MasterKomponens, { foreignKey: "kode_komponen" });
MasterKomponens.hasMany(Komponens, { foreignKey: "kode_komponen" });

Komponens.belongsTo(MasterSuboutputs, { foreignKey: "kode_so" });
MasterSuboutputs.hasMany(Komponens, { foreignKey: "kode_so" });

Komponens.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Komponens, { foreignKey: "kode_output" });

Komponens.belongsTo(Kegiatans, { foreignKey: "kode_kegiatan" });
Kegiatans.hasMany(Komponens, { foreignKey: "kode_kegiatan" });

Komponens.belongsTo(Programs, { foreignKey: "kode_program" });
Programs.hasMany(Komponens, { foreignKey: "kode_program" });

export default Komponens;