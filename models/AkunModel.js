import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import Programs from "./ProgramModel.js";
import MasterSuboutputs from "./MasterSuboutputModel.js";
import MasterSubkomponens from "./MasterSubkomponenModel.js";
import MasterAkun from "./MasterAkunModel.js";
const { DataTypes } = Sequelize;

const Akuns = db.define(
  "akun",{
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    kode_akun: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: MasterAkun,
            key: "kode_akun",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
Akuns.belongsTo(MasterAkun, { foreignKey: "kode_akun" });
MasterAkun.hasMany(Akuns, { foreignKey: "kode_akun" });

Akuns.belongsTo(MasterSuboutputs, { foreignKey: "kode_so" });
MasterSuboutputs.hasMany(Akuns, { foreignKey: "kode_so" });

Akuns.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Akuns, { foreignKey: "kode_output" });

Akuns.belongsTo(Kegiatans, { foreignKey: "kode_kegiatan" });
Kegiatans.hasMany(Akuns, { foreignKey: "kode_kegiatan" });

Akuns.belongsTo(Programs, { foreignKey: "kode_program" });
Programs.hasMany(Akuns, { foreignKey: "kode_program" });

export default Akuns;