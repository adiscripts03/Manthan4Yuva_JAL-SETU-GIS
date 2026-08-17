import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // try backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') }); // try Jalsetu-main-3/.env


export const config = {
  port: parseInt(process.env.PORT || '5050', 10),
  mongoUri: process.env.MONGO_URI || '',
  dbName: process.env.DB_NAME || 'jal_setu',
  assetsPath: path.resolve(__dirname, '../../../assets'),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  groqApiKey: process.env.GROQ_API_KEY || '',
};

/**
 * Validates that required environment variables are set.
 * Throws descriptive errors for missing config.
 */
export function validateConfig(): void {
  if (!config.mongoUri) {
    throw new Error(
      'MONGO_URI environment variable is required. ' +
      'Set it in backend/.env (e.g., mongodb+srv://user:pass@cluster.mongodb.net/)'
    );
  }
}
