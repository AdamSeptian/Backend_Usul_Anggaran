import Operators from "./OperatorModel.js";
import UnitKerjas from "./UnitKerjaModel.js";
import Pagus from "./PaguModel.js";
import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const Pengajuans = db.define("pengajuan", {
  pengajuan_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nomor_pengajuan: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  operator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Operators,
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
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
  },
  // --- TAMBAHAN FIELD REKAPITULASI TOTAL NOMINAL PENGAJUAN ---
  total_nominal_pengajuan: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  jenis_pagu: { type: DataTypes.STRING, allowNull: true },
  pagu_id: {
    type: DataTypes.INTEGER, allowNull: true,
    references: { model: Pagus, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'revision'),
    defaultValue: 'draft',
  },
  current_position: {
    type: DataTypes.ENUM('operator', 'pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'),
    defaultValue: 'operator',
  },
  max_position: {
  type: DataTypes.ENUM('pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'),
  defaultValue: 'pimpinan_unit',
  },
  catatan_revisi: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  freezeTableName: true,
});

Pengajuans.belongsTo(UnitKerjas, { foreignKey: "kode_unit_kerja" });
UnitKerjas.hasMany(Pengajuans, { foreignKey: "kode_unit_kerja" });

Pengajuans.belongsTo(Operators, { foreignKey: "operator_id" });
Operators.hasMany(Pengajuans, { foreignKey: "operator_id" });

export default Pengajuans;
