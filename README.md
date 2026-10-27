# ポケカエミュレータ ＋ CPU AI

配布版 **7.0.3**（番号は `VERSION`）。変更点は `docs/CHANGELOG.md` を参照してください。

## CPUと対戦する

フォルダを展開し、`index.html` を開きます。`ai` フォルダは `index.html` と同じ場所に置いてください。CPU側のデッキに応じて専用AIが自動で選ばれます。

| CPUのデッキ | AI |
|---|---|
| Nのゾロアークex | `ai/decks/ai_zoroark.js` |
| ドラパルトex | `ai/decks/ai_dragapult.js` |
| メガレックウザex | `ai/decks/ai_rayquaza.js` |
| それ以外 | 従来CPU（`ai/legacy/`） |

## フォルダの役割

| 場所 | 内容 |
|---|---|
| `index.html` ほか直下のファイル | エミュレータ本体とアイコン類 |
| `ai/` | 対戦中に読み込むAI。詳しくは `ai/README.md` |
| `debug/` | 対戦の記録機能とソース指紋 |
| `docs/` | 変更履歴、開発・検証の手引き、AIの設計資料。索引は `docs/README.md` |
| `sim/` | 開発用の自動対戦・テスト・調整ツール。CPU戦だけなら不要。詳しくは `sim/README.md` |

## AIを検証する

Node.jsで、このフォルダから実行します（追加パッケージ不要）。

```bash
node sim/run.js test
node sim/run.js help
```

使い方の詳細、相互強化の進め方、対戦記録の再現は `docs/DEVELOPMENT.md` にまとめています。
CPU対戦の記録は、バトルログの「解析用ログを保存」から取得できます（次の試合を始めると前の記録は消えます）。
