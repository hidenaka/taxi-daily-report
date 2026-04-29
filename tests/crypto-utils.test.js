import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encrypt, decrypt } from '../js/crypto-utils.js';

describe('crypto-utils', () => {
  it('encrypt/decrypt roundtrip', async () => {
    const plain = 'github_pat_test_12345';
    const passphrase = 'my-secret-key-42';
    const encrypted = await encrypt(plain, passphrase);
    const decrypted = await decrypt(encrypted, passphrase);
    assert.strictEqual(decrypted, plain);
  });

  it('different passphrase fails', async () => {
    const plain = 'github_pat_test_12345';
    const encrypted = await encrypt(plain, 'correct-key');
    await assert.rejects(() => decrypt(encrypted, 'wrong-key'));
  });
});
