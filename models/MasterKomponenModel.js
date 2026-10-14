import { Sequelize } from "sequelize";
import db from "../config/Database.js";
const { DataTypes } = Sequelize;

const MasterKomponens = db.define(
  "master_komponen",{
    kode_komponen: {
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
export default MasterKomponens;