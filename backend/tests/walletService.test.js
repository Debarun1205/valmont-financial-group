const assert = require('assert');
const { computeBalance, validateTransfer, validateVaultDeposit } = require('../services/walletService');

function run() {
  const txs = [
    { amount: 500, direction: 'in' },
    { amount: 120, direction: 'out' },
    { amount: 30, direction: 'out' }
  ];
  assert.strictEqual(computeBalance(txs), 350, 'balance should net in/out correctly');
  assert.strictEqual(computeBalance([]), 0, 'empty ledger should be zero balance');

  const okTransfer = validateTransfer({ currentBalance: 350, amount: 100 });
  assert.strictEqual(okTransfer.ok, true);

  const overdraft = validateTransfer({ currentBalance: 350, amount: 1000 });
  assert.strictEqual(overdraft.ok, false);
  assert.match(overdraft.error, /insufficient/);

  const badAmount = validateTransfer({ currentBalance: 350, amount: -5 });
  assert.strictEqual(badAmount.ok, false);

  const vaultOk = validateVaultDeposit({ currentBalance: 350, amount: 200 });
  assert.strictEqual(vaultOk.ok, true);
  const vaultOverdraft = validateVaultDeposit({ currentBalance: 350, amount: 400 });
  assert.strictEqual(vaultOverdraft.ok, false);

  console.log('✅ walletService: all assertions passed');
}

run();
