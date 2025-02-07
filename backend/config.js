import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';

dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  'GCP_PROJECT_ID',
  'GCP_BUCKET_NAME',
  'GCP_SERVICE_ACCOUNT_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Parse service account credentials
let gcpCredentials;
try {
  gcpCredentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
} catch (error) {
  throw new Error('Invalid GCP_SERVICE_ACCOUNT_KEY format', { cause: error });
}

// Initialize Storage client
export const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: gcpCredentials
});
// const storage = new Storage({
//   projectId: process.env.GCP_PROJECT_ID,
//   credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
// });

export const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);
