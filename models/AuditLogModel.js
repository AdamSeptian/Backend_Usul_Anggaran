import { DataTypes } from "sequelize";
import db from "../config/Database.js";
import Pengajuans from "./PengajuanModel.js";

const AuditLogs = db.define("audit_log", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    operator_id: { type: DataTypes.INTEGER, allowNull: false },
    actor: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    target: { type: DataTypes.STRING, allowNull: false },
    pengajuan_id: { type: DataTypes.INTEGER, allowNull: true },
    before: DataTypes.STRING,
    after: DataTypes.STRING,
    note: DataTypes.TEXT,
}, { freezeTableName: true, updatedAt: false });

AuditLogs.belongsTo(Pengajuans, { as: "pengajuan", foreignKey: "pengajuan_id", constraints: false });

export default AuditLogs;
