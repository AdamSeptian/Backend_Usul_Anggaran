import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const MasterOutputs = db.define(
  "master_output",{
    kode_output: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    }},
  {
    freezeTableName: true,
  }
);
export default MasterOutputs;