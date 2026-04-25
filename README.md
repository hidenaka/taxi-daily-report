# タクシー日報

個人タクシー乗務員のための日報管理PWA。OCR済みテキストから売上集計・歩率計算・天候記録を自動化。

## セットアップ
1. GitHub Personal Access Token を発行（`repo` 権限）
2. `settings.html` を開いてトークンを設定
3. `data/config.json` のレートテーブルとデフォルト値を確認

## 開発
- ユニットテスト: `node --test tests/`
- ローカル起動: `python3 -m http.server 8000` または `npx serve`

詳細は `docs/superpowers/specs/` を参照。
