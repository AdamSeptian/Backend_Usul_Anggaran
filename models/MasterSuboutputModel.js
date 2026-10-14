import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const MasterSuboutputs = db.define(
  "master_suboutput",{
    kode_so: {
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
export default MasterSuboutputs;