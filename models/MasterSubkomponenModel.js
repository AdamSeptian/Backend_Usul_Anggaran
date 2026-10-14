import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const MasterSubkomponens = db.define(
  "master_subkomponen",{
    kode_sk: {
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
export default MasterSubkomponens;