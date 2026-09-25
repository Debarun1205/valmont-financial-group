const { MongoClient } = require('mongodb');
const { createPool } = require('./mongoCompat');

const mongoUri =
  process.env.MONGODB_URI ||
  (String(process.env.DATABASE_URL || '').startsWith('mongodb') ? process.env.DATABASE_URL : '');

let client;
let db;
const pool = createPool(() => {
  if (!db) {
    throw new Error('MongoDB is not connected. Set MONGODB_URI to your MongoDB connection string.');
  }
  return db;
});

function getHasTimescale() {
  return false;
}

function getDb() {
  return db;
}

async function initSchema() {
  if (!mongoUri) {
    const err = new Error(
      'Missing MongoDB URL. Set MONGODB_URI (mongodb://... or mongodb+srv://...) in backend/.env'
    );
    err.code = 'MONGODB_URI_MISSING';
    throw err;
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'valmont');

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ id: 1 }, { unique: true });
  await db.collection('wallets').createIndex({ user_id: 1 }, { unique: true });
  await db.collection('transactions').createIndex({ user_id: 1, time: -1 });
  await db.collection('trust_scores').createIndex({ user_id: 1, computed_at: -1 });
  await db.collection('loans').createIndex({ borrower_id: 1, created_at: -1 });
  await db.collection('loans').createIndex({ status: 1, created_at: -1 });
  await db.collection('loan_installments').createIndex({ loan_id: 1, installment_number: 1 });
  await db.collection('investment_advice').createIndex({ user_id: 1, created_at: -1 });
  await db.collection('insurance_policies').createIndex({ user_id: 1, created_at: -1 });
  await db.collection('remittances').createIndex({ user_id: 1, created_at: -1 });
  await db.collection('ml_training_runs').createIndex({ user_id: 1, created_at: -1 });
  await db.collection('ds_application_runs').createIndex({ user_id: 1, created_at: -1 });

  console.log('[db] MongoDB connected — indexes ensured');
}

module.exports = { pool, initSchema, getHasTimescale, getDb };
