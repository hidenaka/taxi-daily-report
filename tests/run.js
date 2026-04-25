// node --test を使うシンプルなランナー
// 各 *.test.js ファイルは import.meta.main 直下で test() を呼ぶ
import { test } from 'node:test';
import assert from 'node:assert/strict';

export { test, assert };
