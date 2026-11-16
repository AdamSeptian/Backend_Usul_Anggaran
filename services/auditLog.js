import AuditLogs from "../models/AuditLogModel.js";

export function recordAudit(req, event, transaction) {
    return AuditLogs.create({
        ...event,
        operator_id: req.operatorId,
        actor: req.email,
        role: req.role,
    }, { transaction });
}

const modules = new Map([
    ...["akuns", "master-satuans", "unit-kerjas", "programs", "kegiatans", "outputs",
        "suboutputs", "komponens", "subkomponens", "jenis-belanjas", "ikus",
        "master-outputs", "master-suboutputs", "master-komponens", "master-subkomponens"
    ].map(path => [path, "Master"]),
    ["pagus", "Pagu"], ["master-pagus", "Pagu"], ["operators", "Pengguna"],
]);
const actions = { POST: "TAMBAH", PATCH: "UBAH", DELETE: "HAPUS" };

export function auditManagement(req, res, next) {
    const path = req.path;
    const module = modules.get(path.split("/")[1]);
    const action = actions[req.method];
    if (module && action) {
        // Existing management handlers commit independently. Record only a successful response.
        res.once("finish", () => {
            if (!req.operatorId || res.statusCode < 200 || res.statusCode >= 300) return;
            recordAudit(req, { module, action, target: path.slice(0, 255) }).catch(error => {
                console.error("Gagal mencatat audit perubahan data:", error.name);
            });
        });
    }
    next();
}
