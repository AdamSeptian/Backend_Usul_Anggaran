import { Sequelize } from "sequelize";
import db from "../config/Database.js";
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
    },
  {
    freezeTableName: true,
  }
);
Subkomponens.belongsTo(MasterSubkomponens, { foreignKey: "kode_sk" });
MasterSubkomponens.hasMany(Subkomponens, { foreignKey: "kode_sk" });

export default Subkomponens;