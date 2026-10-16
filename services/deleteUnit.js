// Lock the parent row before checking references so FK inserts cannot race deletion.
export function createDeleteUnitService(db, units, references) {
    return async (id) => db.transaction(async (transaction) => {
        const unit = await units.findOne({
            where: { kode_unit_kerja: id }, transaction, lock: transaction.LOCK.UPDATE,
        });
        if (!unit) throw Object.assign(new Error('Data unit kerja tidak ditemukan'), { status: 404 });

        const usedBy = [];
        for (const { model, label } of references) {
            const related = await model.findOne({
                where: { kode_unit_kerja: id }, transaction, lock: transaction.LOCK.UPDATE,
            });
            if (related) usedBy.push(label);
        }
        if (usedBy.length) {
            throw Object.assign(new Error(`Unit kerja tidak dapat dihapus karena masih digunakan oleh ${usedBy.join(', ')}.`), { status: 409 });
        }
        await unit.destroy({ transaction });
    });
}
