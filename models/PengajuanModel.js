import Operators from "./OperatorModel.js";
import UnitKerjas from "./UnitKerjaModel.js";
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
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'revision'),
    defaultValue: 'draft',
  },
  current_position: {
    type: DataTypes.ENUM('operator', 'pimpinan_unit', 'tim_sakip', 'spi', 'kpa', 'completed'),
    defaultValue: 'operator',
  },
  catatan_revisi: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  freezeTableName: true,
});

export default Pengajuans;