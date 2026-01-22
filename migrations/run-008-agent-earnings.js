const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');

async function runMigration() {
    try {
        console.log('Starting Agent Earnings System migration...');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, '008_agent_earnings_system.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolons and filter empty statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        // Execute each statement
        for (const statement of statements) {
            try {
                await sequelize.query(statement);
                console.log('✓ Executed statement successfully');
            } catch (error) {
                // Ignore "already exists" errors
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate key')) {
                    console.log('⚠ Skipped (already exists):', error.message.substring(0, 50));
                } else {
                    console.error('✗ Error:', error.message);
                }
            }
        }
        
        console.log('\n✅ Agent Earnings System migration completed!');
        console.log('\nTables created:');
        console.log('  - agent_payouts');
        console.log('  - agent_earnings');
        console.log('  - delivery_settings');
        console.log('\nColumns added to users:');
        console.log('  - agent_bank_name, agent_account_name, agent_account_number');
        console.log('  - agent_total_deliveries, agent_rating, agent_rating_count');
        console.log('\nColumns added to orders:');
        console.log('  - delivery_fee, delivery_distance_km');
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
