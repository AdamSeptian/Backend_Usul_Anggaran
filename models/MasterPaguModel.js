import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const MasterPagus = db.define(
  "master_pagu",{
    jenis_pagu: {
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
export default MasterPagus;