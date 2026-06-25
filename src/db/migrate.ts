import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './client';
import { logger } from '../logger';

export async function migrate(): Promise<void> {
  logger.info('Running database migrations');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  logger.info('Database migrations complete');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Migration failed');
      process.exit(1);
    });
}
