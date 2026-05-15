const { sequelize } = require('../models');

async function run() {
    const missing = [];

    // Get all model definitions from Sequelize
    const models = sequelize.models;

    for (const [modelName, model] of Object.entries(models)) {
        const tableName = model.getTableName();
        try {
            const [cols] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\``);
            const dbCols = new Set(cols.map(c => c.Field));

            const modelCols = Object.keys(model.rawAttributes).map(attr => {
                const field = model.rawAttributes[attr].field || attr;
                return field;
            });

            for (const col of modelCols) {
                if (!dbCols.has(col)) {
                    missing.push({ table: tableName, column: col, model: modelName });
                }
            }
        } catch (err) {
            console.error(`⚠️  Could not check table "${tableName}": ${err.message}`);
        }
    }

    if (missing.length === 0) {
        console.log('✅  All model columns exist in the database — no missing columns!');
    } else {
        console.log(`\n❌  Found ${missing.length} missing column(s):\n`);
        const byTable = {};
        for (const { table, column } of missing) {
            if (!byTable[table]) byTable[table] = [];
            byTable[table].push(column);
        }
        for (const [table, cols] of Object.entries(byTable)) {
            console.log(`  TABLE: ${table}`);
            cols.forEach(c => console.log(`    - ${c}`));
        }
        console.log('\n👉  Run the fix script to add all missing columns.');
    }

    await sequelize.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });
