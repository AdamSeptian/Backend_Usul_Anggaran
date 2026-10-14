import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import Programs from "./ProgramModel.js";
import MasterSuboutputs from "./MasterSuboutputModel.js";
import MasterKomponens from "./MasterKomponenModel.js";
import MasterSubkomponens from "./MasterSubkomponenModel.js";
const { DataTypes } = Sequelize;

const Subkomponens = db.define(
  "subkomponen",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    nama_subkomponen: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_sk: {
      type: DataTypes.STRING,
      allowNull: false,
        references: {
            model: MasterSubkomponens,
            key: "kode_sk",
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
Subkomponens.belongsTo(MasterSubkomponens, { foreignKey: "kode_sk" });
MasterSubkomponens.hasMany(Subkomponens, { foreignKey: "kode_sk" });

Subkomponens.belongsTo(MasterKomponens, { foreignKey: "kode_komponen" });
MasterKomponens.hasMany(Subkomponens, { foreignKey: "kode_komponen" });

Subkomponens.belongsTo(MasterSuboutputs, { foreignKey: "kode_so" });
MasterSuboutputs.hasMany(Subkomponens, { foreignKey: "kode_so" });

Subkomponens.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Subkomponens, { foreignKey: "kode_output" });

Subkomponens.belongsTo(Kegiatans, { foreignKey: "kode_kegiatan" });
Kegiatans.hasMany(Subkomponens, { foreignKey: "kode_kegiatan" });

Subkomponens.belongsTo(Programs, { foreignKey: "kode_program" });
Programs.hasMany(Subkomponens, { foreignKey: "kode_program" });

export default Subkomponens;