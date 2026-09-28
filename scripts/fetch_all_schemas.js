/**
 * Fetch every subcategory's schema from the PRODUCTION API.
 *
 * Flow:
 *   1. GET /api/v1/categories  -> categories[] each with subcategories[]
 *   2. For each subcategory: GET /api/v1/categories/subcategories/:id/schema
 *   3. Print the resolved schema (DB column > slug fallback > empty)
 *
 * The schema GET endpoint is public (no auth required).
 *
 * Run:  node scripts/fetch_all_schemas.js
 */
const PROD_BASE = 'https://api.shegergebeya.com/api/v1';

const pretty = (obj) => {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
};

const apiGet = async (path) => {
    const url = `${PROD_BASE}${path}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { throw new Error(`Non-JSON from ${url}: ${text.slice(0, 200)}`); }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}: ${json?.message || text.slice(0, 200)}`);
    }
    return json;
};

(async () => {
    try {
        console.log(`Fetching categories from ${PROD_BASE}/categories ...\n`);
        const catsResp = await apiGet('/categories');
        const categories = catsResp?.data?.categories || catsResp?.categories || [];
        if (!categories.length) {
            console.log('No categories returned from API.');
            return;
        }
        console.log(`Found ${categories.length} categories\n`);
        console.log('='.repeat(100));

        let totalSubs = 0;
        let withSchema = 0;
        let withNoSchema = 0;
        const allRows = [];

        for (const cat of categories) {
            const subs = cat.subcategories || [];
            for (const sub of subs) {
                totalSubs++;
                const subCatId = sub.sub_cat_id;
                let schemaResp;
                try {
                    schemaResp = await apiGet(`/categories/subcategories/${subCatId}/schema`);
                } catch (e) {
                    console.log(`\n📦 ${cat.name} > ${sub.name}`);
                    console.log(`   sub_cat_id : ${subCatId}`);
                    console.log(`   slug       : ${sub.slug || '(none)'}`);
                    console.log(`   ERROR      : ${e.message}`);
                    console.log('-'.repeat(100));
                    withNoSchema++;
                    continue;
                }
                const schema = schemaResp?.data?.schema || schemaResp?.schema || [];
                const source = (Array.isArray(schema) && schema.length > 0) ? 'has schema' : 'empty';
                if (Array.isArray(schema) && schema.length > 0) withSchema++; else withNoSchema++;

                const row = {
                    category: cat.name,
                    cat_id: cat.cat_id,
                    subcategory: sub.name,
                    sub_cat_id: subCatId,
                    slug: sub.slug || null,
                    is_active: sub.is_active,
                    field_count: Array.isArray(schema) ? schema.length : 0,
                    schema,
                };
                allRows.push(row);

                console.log(`\n📦 ${cat.name} > ${sub.name}`);
                console.log(`   sub_cat_id : ${subCatId}`);
                console.log(`   slug       : ${sub.slug || '(none)'}`);
                console.log(`   is_active  : ${sub.is_active}`);
                console.log(`   field count: ${row.field_count}`);
                console.log(`   schema     :`);
                console.log(pretty(schema));
                console.log('-'.repeat(100));
            }
        }

        console.log(`\nSUMMARY`);
        console.log(`  API base          : ${PROD_BASE}`);
        console.log(`  Categories        : ${categories.length}`);
        console.log(`  Total subcats     : ${totalSubs}`);
        console.log(`  With schema       : ${withSchema}`);
        console.log(`  Empty/no schema   : ${withNoSchema}`);

        // Also dump a compact JSON file for downstream tooling
        const fs = require('fs');
        const outPath = require('path').join(__dirname, 'all_schemas_dump.json');
        fs.writeFileSync(outPath, pretty(allRows));
        console.log(`\n  Full dump written to: ${outPath}`);
    } catch (err) {
        console.error('Error:', err.message);
        console.error(err.stack);
        process.exitCode = 1;
    }
})();
