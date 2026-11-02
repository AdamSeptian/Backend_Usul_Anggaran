import { Op } from 'sequelize';
import db from '../config/Database.js';
import UnitKerjas from '../models/UnitKerjaModel.js';
import Pagus from '../models/PaguModel.js';
import Pengajuans from '../models/PengajuanModel.js';
import { createUnitDashboardService } from '../services/unitDashboard.js';

const load = createUnitDashboardService({ db, units: UnitKerjas, pagus: Pagus, pengajuans: Pengajuans, inOperator: Op.in });

export const getUnitDashboard = async (req, res) => {
    try { res.status(200).json(await load(req)); }
    catch (error) { res.status(error.status || 500).json({ msg: error.message }); }
};
