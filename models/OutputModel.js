import { Sequelize } from "sequelize";
import db from "../config/Database.js";
import MasterOutputs from "./MasterOutputModel.js";
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
    }},
  {
    freezeTableName: true,
  }
);
Outputs.belongsTo(MasterOutputs, { foreignKey: "kode_output" });
MasterOutputs.hasMany(Outputs, { foreignKey: "kode_output" });

export default Outputs;