
import * as fs from 'fs';
import * as path from 'path';

const USER_ID = '711b3ad0-b3b9-47e6-9b74-7a3c05644f31';
const TABLE_NAME = 'gold_purchase_records';

async function generateSql() {
  try {
    const jsonPath = path.resolve(process.cwd(), 'scripts/gold_history.json');
    const sqlPath = path.resolve(process.cwd(), 'scripts/insert_gold_records.sql');

    if (!fs.existsSync(jsonPath)) {
      console.error(`File not found: ${jsonPath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const records = JSON.parse(fileContent);

    console.log(`Found ${records.length} records. Generating SQL...`);

    let sqlContent = `-- Generated SQL for inserting gold purchase records\n`;
    sqlContent += `-- User: ${USER_ID}\n`;
    sqlContent += `-- Total Records: ${records.length}\n\n`;

    for (const record of records) {
      // Date conversion: Beijing "2025-10-21" -> UTC ISO String
      const purchaseDateStr = record.purchase_date;
      const beijingISO = `${purchaseDateStr}T00:00:00+08:00`;
      const purchaseDateObj = new Date(beijingISO);
      const purchaseDateUTC = purchaseDateObj.toISOString();

      // Escape strings just in case (though data seems safe)
      const channel = record.purchase_channel.replace(/'/g, "''");

      const values = [
        `'${USER_ID}'`,
        `'${purchaseDateUTC}'`, // Postgres handles ISO strings for timestamptz
        record.weight,
        record.gold_price_per_gram,
        record.handling_fee_per_gram,
        `'${channel}'`
      ];

      sqlContent += `INSERT INTO ${TABLE_NAME} (user_id, purchase_date, weight, gold_price_per_gram, handling_fee_per_gram, purchase_channel) VALUES (${values.join(', ')});\n`;
    }

    fs.writeFileSync(sqlPath, sqlContent);
    console.log(`SQL script generated at: ${sqlPath}`);

  } catch (err) {
    console.error('Error generating SQL:', err);
  }
}

generateSql();
