import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
import Kegiatans from "./KegiatanModel.js";
import Programs from "./ProgramModel.js";
import MasterSuboutputs from "./MasterSuboutputModel.js";
import MasterSubkomponens from "./MasterSubkomponenModel.js";
import Pengajuans from "./PengajuanModel.js";
import MasterSatuans from "./MasterSatuanModel.js";
import JenisBelanjas from "./JenisBelanjaModel.js";
import MasterKomponens from "./MasterKomponenModel.js";
import Ikus from "./IkuModel.js";
import Akuns from "./AkunModel.js";
const { DataTypes } = Sequelize;

const Anggarans = db.define(
  "anggaran", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    pengajuan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Pengajuans,
        key: "pengajuan_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      validate: {
        notEmpty: true,
      },
    },
    nama_item: { type: DataTypes.STRING, allowNull: true },
    kode_komponen: {
      type: DataTypes.STRING, allowNull: true,
      references: { model: MasterKomponens, key: "kode_komponen" },
      onUpdate: "CASCADE", onDelete: "RESTRICT",
    },
    kode_iku: {
      type: DataTypes.STRING, allowNull: true,
      references: { model: Ikus, key: "kode_iku" },
      onUpdate: "CASCADE", onDelete: "RESTRICT",
    },
    target_iku: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    kode_jenis_belanja: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: JenisBelanjas,
        key: "kode_jenis_belanja",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      validate: {
        notEmpty: true,
      },
    },
    volume: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    kode_satuan: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      references: {
        model: MasterSatuans,
        key: "kode_satuan",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    nominal_satuan: {
      type: DataTypes.BIGINT, // Diubah ke BIGINT untuk amannya nilai uang yang besar
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    total_nominal: {
      type: DataTypes.BIGINT, // Diubah ke BIGINT
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    kode_akun: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Akuns,
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
      validate: {
        notEmpty: true,
      },
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
      validate: {
        notEmpty: true,
      },
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
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    freezeTableName: true,
  }
);

Anggarans.belongsTo(Pengajuans, { foreignKey: "pengajuan_id" });
Pengajuans.hasMany(Anggarans, { foreignKey: "pengajuan_id" });

Anggarans.belongsTo(JenisBelanjas, { foreignKey: "kode_jenis_belanja" });
JenisBelanjas.hasMany(Anggarans, { foreignKey: "kode_jenis_belanja" });

Anggarans.belongsTo(MasterSatuans, { foreignKey: "kode_satuan" });
MasterSatuans.hasMany(Anggarans, { foreignKey: "kode_satuan" });

Anggarans.belongsTo(Akuns, { foreignKey: "kode_akun" });
Akuns.hasMany(Anggarans, { foreignKey: "kode_akun" });

Anggarans.belongsTo(MasterSubkomponens, { foreignKey: "kode_sk" });
MasterSubkomponens.hasMany(Anggarans, { foreignKey: "kode_sk" });

Anggarans.belongsTo(MasterSuboutputs, { foreignKey: "kode_so" });
MasterSuboutputs.hasMany(Anggarans, { foreignKey: "kode_so" });

Anggarans.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Anggarans, { foreignKey: "kode_output" });

Anggarans.belongsTo(Kegiatans, { foreignKey: "kode_kegiatan" });
Kegiatans.hasMany(Anggarans, { foreignKey: "kode_kegiatan" });

Anggarans.belongsTo(Programs, { foreignKey: "kode_program" });
Programs.hasMany(Anggarans, { foreignKey: "kode_program" });

export default Anggarans;