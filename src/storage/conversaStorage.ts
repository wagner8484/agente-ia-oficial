import pkg from 'pg';
const { Pool } = pkg;

import dotenv from 'dotenv';
dotenv.config();

console.log('PGHOST:', process.env.PGHOST);

// O Pool já pega PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT automaticamente do .env
const pool = new Pool();

async function ensureTableAndConstraint() {
  // Cria a tabela se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversas (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      historico JSONB NOT NULL,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Verifica se a constraint UNIQUE já existe
  const checkConstraint = await pool.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'conversas'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'conversas_user_id_unique';
  `);

  // Cria a constraint se não existir
  if (checkConstraint.rows.length === 0) {
    console.log('🔧 Criando constraint UNIQUE em user_id...');
    await pool.query(`
      ALTER TABLE conversas
      ADD CONSTRAINT conversas_user_id_unique UNIQUE (user_id);
    `);
  }
}

// Garante que tabela e constraint existam na inicialização
ensureTableAndConstraint().catch(console.error);

// Retorna o histórico do usuário
export async function getHistorico(userId: string): Promise<any[]> {
  await ensureTableAndConstraint();
  const result = await pool.query('SELECT historico FROM conversas WHERE user_id = $1 LIMIT 1', [
    userId,
  ]);
  if (result.rows.length > 0) {
    return result.rows[0].historico;
  }
  return [];
}

// Salva ou atualiza o histórico
export async function salvarHistorico(userId: string, historico: any[]) {
  await ensureTableAndConstraint();
  await pool.query(
    `
    INSERT INTO conversas (user_id, historico, atualizado_em)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET historico = $2, atualizado_em = NOW();
    `,
    [userId, JSON.stringify(historico)],
  );
}
