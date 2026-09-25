const { randomUUID } = require('crypto');

const JSON_FIELDS = new Set([
  'onboarding',
  'raw_extraction',
  'evidence',
  'allocation',
  'goal_framing',
  'weeks',
  'metrics',
  'feature_snapshot',
  'result'
]);

const DEFAULTS = {
  users: { role: 'individual' },
  wallets: { savings_vault_balance: 0 },
  transactions: { channel: 'wallet', asset: 'USD' },
  loans: { status: 'pending' },
  loan_installments: { paid: false },
  insurance_policies: { status: 'active' },
  insurance_claims: { status: 'filed' },
  remittances: { status: 'sent' },
  ml_training_runs: { status: 'completed', epochs: 8 },
  income_documents: { currency: 'USD' }
};

const TIME_FIELDS = new Set([
  'created_at',
  'computed_at',
  'time',
  'funded_at',
  'paid_at',
  'due_at'
]);

function stripSql(sql) {
  return String(sql)
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function maybeJson(value) {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  if (!t || (t[0] !== '{' && t[0] !== '[')) return value;
  try {
    return JSON.parse(t);
  } catch {
    return value;
  }
}

function parseIntervalMs(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|hour|hours|minute|minutes)$/);
  if (!m) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(m[1]);
  const unit = m[2];
  if (unit.startsWith('week')) return n * 7 * 86400000;
  if (unit.startsWith('day')) return n * 86400000;
  if (unit.startsWith('hour')) return n * 3600000;
  return n * 60000;
}

function resolveToken(token, params) {
  const t = token.trim();
  if (/^\$\d+$/.test(t)) return params[Number(t.slice(1)) - 1];
  if (/^now\(\)$/i.test(t)) return new Date();
  if (/^gen_random_uuid\(\)$/i.test(t)) return randomUUID();
  if (/^true$/i.test(t)) return true;
  if (/^false$/i.test(t)) return false;
  if (/^null$/i.test(t)) return null;
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function splitComma(list) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < list.length; i += 1) {
    const ch = list[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function toRow(doc) {
  if (!doc) return doc;
  const row = { ...doc };
  delete row._id;
  for (const key of TIME_FIELDS) {
    if (row[key] instanceof Date) {
      // leave Date — Express JSON serialization matches pg timestamps
    }
  }
  return row;
}

function pick(row, returning) {
  if (!returning || returning.trim() === '*') return row;
  const cols = splitComma(returning).map((c) => {
    const parts = c.trim().split(/\s+as\s+/i);
    const src = parts[0].replace(/^.*\./, '').trim();
    const alias = (parts[1] || src).trim();
    return { src, alias };
  });
  const out = {};
  for (const { src, alias } of cols) {
    if (src === '*') return row;
    out[alias] = row[src];
  }
  return out;
}

function applyDefaults(table, doc) {
  const d = { ...(DEFAULTS[table] || {}), ...doc };
  if (!d.id) d.id = randomUUID();
  if (table === 'transactions' && !d.time) d.time = new Date();
  if (table === 'trust_scores' && !d.computed_at) d.computed_at = new Date();
  if (!d.created_at && table !== 'transactions' && table !== 'loan_installments') {
    d.created_at = new Date();
  }
  if (table === 'loan_installments' && d.paid == null) d.paid = false;
  d._id = d.id;
  return d;
}

function coerceInsertValue(col, value) {
  if (JSON_FIELDS.has(col)) return maybeJson(value);
  if (TIME_FIELDS.has(col) && value != null && !(value instanceof Date)) {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? value : dt;
  }
  if (col.includes('_pct') || col.includes('amount') || col.includes('income') || col.includes('balance') || col === 'score' || col === 'epochs' || col === 'term_months' || col === 'horizon_months' || col === 'horizon_weeks' || col === 'expected_grad_year' || col === 'installment_number' || col === 'coverage_amount' || col === 'monthly_premium' || col === 'claim_amount' || col === 'fx_rate' || col === 'dest_amount' || col === 'source_amount_usd' || col === 'fee_usd' || col === 'extracted_monthly_income' || col === 'monthly_allowance' || col === 'target_savings_pct' || col.includes('component') || col.includes('multiplier') || col.includes('principal') || col.includes('interest')) {
    if (value == null || value === '') return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

function parseWhere(whereSql, params) {
  if (!whereSql) return {};
  let sql = whereSql.trim();
  if (/^where\s+/i.test(sql)) sql = sql.replace(/^where\s+/i, '');

  const andParts = splitByAnd(sql);
  const filter = {};

  for (const part of andParts) {
    const p = part.trim();

    const anyM = p.match(/^(\w+)\s*=\s*ANY\(\$(\d+)\)$/i);
    if (anyM) {
      const ids = params[Number(anyM[2]) - 1] || [];
      filter[anyM[1]] = { $in: Array.isArray(ids) ? ids : [ids] };
      continue;
    }

    const intervalParam = p.match(/^(\w+)\s*>\s*now\(\)\s*-\s*\$(\d+)::interval$/i);
    if (intervalParam) {
      const ms = parseIntervalMs(params[Number(intervalParam[2]) - 1]);
      filter[intervalParam[1]] = { $gt: new Date(Date.now() - ms) };
      continue;
    }

    const intervalLit = p.match(/^(\w+)\s*>\s*now\(\)\s*-\s*interval\s+'([^']+)'$/i);
    if (intervalLit) {
      filter[intervalLit[1]] = { $gt: new Date(Date.now() - parseIntervalMs(intervalLit[2])) };
      continue;
    }

    const weekConcat = p.match(/^(\w+)\s*>\s*now\(\)\s*-\s*\(\s*\$(\d+)\s*\|\|\s*' weeks'\s*\)::interval$/i);
    if (weekConcat) {
      const weeks = Number(params[Number(weekConcat[2]) - 1]) || 0;
      filter[weekConcat[1]] = { $gt: new Date(Date.now() - weeks * 7 * 86400000) };
      continue;
    }

    const eq = p.match(/^(\w+)\s*=\s*(.+)$/i);
    if (eq) {
      const val = resolveToken(eq[2], params);
      filter[eq[1]] = val === 'FALSE' || val === 'false' ? false : val === 'TRUE' || val === 'true' ? true : val;
    }
  }
  return filter;
}

function splitByAnd(sql) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (depth === 0 && sql.slice(i, i + 5).toUpperCase() === ' AND ') {
      parts.push(cur.trim());
      cur = '';
      i += 4;
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseOrder(orderSql) {
  if (!orderSql) return null;
  let s = orderSql.trim();
  if (/^order by\s+/i.test(s)) s = s.replace(/^order by\s+/i, '');
  const sort = {};
  for (const part of splitComma(s)) {
    const bits = part.trim().split(/\s+/);
    const field = bits[0].replace(/^.*\./, '');
    const dir = (bits[1] || 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
    sort[field] = dir;
  }
  return sort;
}

function parseLimit(limitSql, params) {
  if (!limitSql) return 0;
  const m = limitSql.trim().match(/^limit\s+(\$\d+|\d+)$/i);
  if (!m) return 0;
  return Number(resolveToken(m[1], params)) || 0;
}

function stddevPop(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const varPop = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(varPop);
}

function isAggregateSelect(selectSql) {
  return /\bcount\s*\(|\bavg\s*\(|\bsum\s*\(|\bstddev_pop\s*\(/i.test(selectSql);
}

function computeAggregates(selectSql, docs) {
  const items = splitComma(selectSql);
  const row = {};
  for (const item of items) {
    const asMatch = item.match(/^([\s\S]+?)\s+as\s+(\w+)$/i);
    const expr = (asMatch ? asMatch[1] : item).trim();
    const alias = (asMatch ? asMatch[2] : expr).trim();

    if (/^count\(\s*\*\s*\)(::int)?$/i.test(expr)) {
      if (asMatch) row[alias] = docs.length;
      else {
        row.count = docs.length;
        row.n = docs.length;
      }
      continue;
    }
    const coalesceAvg = expr.match(/^coalesce\(\s*avg\((\w+)\)\s*,\s*([^)]+)\)$/i);
    if (coalesceAvg) {
      const nums = docs.map((d) => Number(d[coalesceAvg[1]])).filter((n) => Number.isFinite(n));
      row[alias] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : Number(coalesceAvg[2]);
      continue;
    }
    const coalesceSum = expr.match(/^coalesce\(\s*sum\((\w+)\)\s*,\s*([^)]+)\)$/i);
    if (coalesceSum) {
      const nums = docs.map((d) => Number(d[coalesceSum[1]])).filter((n) => Number.isFinite(n));
      row[alias] = nums.length ? nums.reduce((a, b) => a + b, 0) : Number(coalesceSum[2]);
      continue;
    }
    const coalesceStd = expr.match(/^coalesce\(\s*stddev_pop\((\w+)\)\s*,\s*([^)]+)\)$/i);
    if (coalesceStd) {
      const nums = docs.map((d) => Number(d[coalesceStd[1]])).filter((n) => Number.isFinite(n));
      row[alias] = nums.length ? stddevPop(nums) : Number(coalesceStd[2]);
      continue;
    }
    const avg = expr.match(/^avg\((\w+)\)$/i);
    if (avg) {
      const nums = docs.map((d) => Number(d[avg[1]])).filter((n) => Number.isFinite(n));
      row[alias] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
  }
  if (row.n == null && Object.keys(row).length === 1 && row.count != null) {
    // keep count
  }
  if (Object.keys(row).length === 0) {
    row.count = docs.length;
    row.n = docs.length;
  }
  return [row];
}

function wrapDuplicate(err) {
  if (err && (err.code === 11000 || err.code === '11000' || /duplicate key/i.test(err.message || ''))) {
    const e = new Error(err.message);
    e.code = '23505';
    return e;
  }
  return err;
}

function createPool(getDb) {
  async function exec(text, params = []) {
    const sql = stripSql(text);
    if (!sql) return { rows: [], rowCount: 0 };

    if (/^(begin|commit|rollback)$/i.test(sql)) {
      return { rows: [], rowCount: 0 };
    }

    if (
      /^(create|alter)\s+/i.test(sql) ||
      /^select create_hypertable/i.test(sql) ||
      /^create\s+index/i.test(sql) ||
      /^create\s+extension/i.test(sql)
    ) {
      return { rows: [], rowCount: 0 };
    }

    const insert = sql.match(/^insert into (\w+)\s*\(([^)]+)\)\s*values\s*\((.+)\)(?:\s*returning\s+(.+))?$/i);
    if (insert) {
      const table = insert[1];
      const cols = splitComma(insert[2]);
      const vals = splitComma(insert[3]).map((t) => resolveToken(t, params));
      const doc = {};
      cols.forEach((col, i) => {
        doc[col] = coerceInsertValue(col, vals[i]);
      });
      const full = applyDefaults(table, doc);
      try {
        await getDb().collection(table).insertOne(full);
      } catch (err) {
        throw wrapDuplicate(err);
      }
      const row = pick(toRow(full), insert[4]);
      return { rows: [row], rowCount: 1 };
    }

    const update = sql.match(/^update (\w+)\s+set\s+(.+?)\s+where\s+(.+?)(?:\s+returning\s+(.+))?$/i);
    if (update) {
      const table = update[1];
      const setSql = update[2];
      const filter = parseWhere(update[3], params);
      const col = getDb().collection(table);
      const docs = await col.find(filter).toArray();
      const clauses = splitComma(setSql);
      for (const doc of docs) {
        for (const clause of clauses) {
          const caseM = clause.match(/^(\w+)\s*=\s*case when (\w+)\s*=\s*(.+?) then (.+?) else \2 end$/i);
          if (caseM) {
            const field = caseM[1];
            const whenField = caseM[2];
            const whenVal = resolveToken(caseM[3], params);
            const thenVal = resolveToken(caseM[4], params);
            if (doc[whenField] === whenVal) doc[field] = coerceInsertValue(field, thenVal);
            continue;
          }
          const inc = clause.match(/^(\w+)\s*=\s*\1\s*\+\s*(.+)$/i);
          if (inc) {
            const field = inc[1];
            const add = Number(resolveToken(inc[2], params)) || 0;
            doc[field] = Number(doc[field] || 0) + add;
            continue;
          }
          const eq = clause.match(/^(\w+)\s*=\s*(.+)$/i);
          if (eq) {
            doc[eq[1]] = coerceInsertValue(eq[1], resolveToken(eq[2], params));
          }
        }
        await col.replaceOne({ id: doc.id }, applyDefaults(table, { ...doc, id: doc.id }));
      }
      const rows = docs.map((d) => pick(toRow(d), update[4]));
      return { rows, rowCount: rows.length };
    }

    if (/^with windowed as/i.test(sql)) {
      // Not used after fraudSignal rewrite; keep a safe empty result.
      return { rows: [{ tx_count: 0, velocity_flags: 0, spike_flags: 0 }], rowCount: 1 };
    }

    const join = sql.match(
      /^select (.+) from (\w+)\s+(\w+)\s+join\s+(\w+)\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)\s+where\s+(.+?)(?:\s+order by\s+(.+))?$/i
    );
    if (join) {
      const selectList = join[1];
      const t1 = join[2];
      const a1 = join[3];
      const t2 = join[4];
      const a2 = join[5];
      const leftA = join[6];
      const leftF = join[7];
      const rightA = join[8];
      const rightF = join[9];
      const whereSql = join[10];
      const orderSql = join[11] ? `ORDER BY ${join[11]}` : '';
      const t1JoinField = a1 === leftA ? leftF : rightF;
      const t2JoinField = a2 === leftA ? leftF : rightF;
      const filter = parseWhere(whereSql.replace(new RegExp(`${a1}\\.`, 'g'), '').replace(new RegExp(`${a2}\\.`, 'g'), ''), params);
      const leftDocs = await getDb().collection(t1).find(filter).toArray();
      const rightDocs = await getDb().collection(t2).find({}).toArray();
      const rightBy = new Map(rightDocs.map((d) => [d[t2JoinField], d]));
      let rows = [];
      for (const ldoc of leftDocs) {
        const rdoc = rightBy.get(ldoc[t1JoinField]);
        if (!rdoc) continue;
        const merged = { ...ldoc };
        const selectCols = splitComma(selectList).map((c) => c.trim());
        const row = {};
        for (const col of selectCols) {
          const asM = col.match(/^(?:(\w+)\.)?(\w+)(?:\s+as\s+(\w+))?$/i);
          if (!asM) continue;
          const aliasTable = asM[1];
          const field = asM[2];
          const outName = asM[3] || field;
          const src = aliasTable === a2 ? rdoc : ldoc;
          row[outName] = src[field];
        }
        rows.push(row);
      }
      const sort = parseOrder(orderSql);
      if (sort) {
        const [field, dir] = Object.entries(sort)[0];
        rows.sort((a, b) => ((a[field] > b[field] ? 1 : -1) * dir));
      }
      return { rows, rowCount: rows.length };
    }

    const distinctOn = sql.match(
      /^select distinct on \((\w+)\) (.+) from (\w+)\s+where\s+(.+?)\s+order by\s+(.+)$/i
    );
    if (distinctOn) {
      const onField = distinctOn[1];
      const table = distinctOn[3];
      const filter = parseWhere(distinctOn[4], params);
      const sort = parseOrder(`ORDER BY ${distinctOn[5]}`);
      const docs = await getDb().collection(table).find(filter).sort(sort || {}).toArray();
      const seen = new Set();
      const rows = [];
      for (const doc of docs) {
        if (seen.has(doc[onField])) continue;
        seen.add(doc[onField]);
        rows.push(pick(toRow(doc), distinctOn[2]));
      }
      return { rows, rowCount: rows.length };
    }

    const distinct = sql.match(/^select distinct (\w+) from (\w+)\s+where\s+(.+)$/i);
    if (distinct) {
      const field = distinct[1];
      const table = distinct[2];
      const filter = parseWhere(distinct[3], params);
      const values = await getDb().collection(table).distinct(field, filter);
      const rows = values.map((v) => ({ [field]: v }));
      return { rows, rowCount: rows.length };
    }

    const select = sql.match(
      /^select (.+) from (\w+)(?:\s+where\s+(.+?))?(?:\s+group by\s+(.+?))?(?:\s+order by\s+(.+?))?(?:\s+limit\s+(\$\d+|\d+))?$/i
    );
    if (select) {
      const selectList = select[1];
      const table = select[2];
      const filter = parseWhere(select[3] ? `WHERE ${select[3]}` : '', params);
      const sort = parseOrder(select[5] ? `ORDER BY ${select[5]}` : '');
      const limit = select[6] ? parseLimit(`LIMIT ${select[6]}`, params) : 0;
      let cursor = getDb().collection(table).find(filter);
      if (sort) cursor = cursor.sort(sort);
      if (limit) cursor = cursor.limit(limit);
      const docs = await cursor.toArray();

      if (isAggregateSelect(selectList) && !select[4]) {
        return { rows: computeAggregates(selectList, docs), rowCount: 1 };
      }

      if (/^count\(\s*\*\s*\)$/i.test(selectList.trim())) {
        return { rows: [{ count: docs.length }], rowCount: 1 };
      }

      const rows = docs.map((d) => pick(toRow(d), selectList));
      return { rows, rowCount: rows.length };
    }

    throw new Error(`Unsupported Mongo SQL: ${sql.slice(0, 180)}`);
  }

  const pool = {
    query: (text, params) => exec(text, params),
    connect: async () => ({
      query: (text, params) => exec(text, params),
      release() {}
    })
  };

  return pool;
}

module.exports = { createPool, parseIntervalMs };
