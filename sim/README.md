# 自動対戦・テスト・学習

CPU戦を遊ぶためのフォルダではありません。AIを検証・調整するときに使います。
**入口は `node sim/run.js <コマンド>` に統一しました。** プロジェクトのルートから実行してください。

| 場所 | 役割 |
|---|---|
| `run.js` | 共通の実行入口。`help` で一覧表示 |
| `cli/` | 対戦評価、比較レポート、ログ表示、速度測定 |
| `lib/` | 画面なしの対戦エンジンと共通処理 |
| `tests/` | 判断・ルール処理・情報制限・ファイル構成のテスト |
| `training/` | パラメータ調整、データ収集、価値関数学習 |
| `tools/` | デッキ取込と想定リストの生成 |
| `decks/` | 検証に使用する60枚リスト |
| `results/` | 検証結果・レポート・調整ログ |
| `docs/` | デッキ書き出しの説明 |
| `archive/` | 過去の実験・旧版生成資料。通常は使用しません |

## よく使うコマンド

```bash
node sim/run.js test
node sim/run.js eval 1000 40000
node sim/run.js verify-info
node sim/run.js verify-hidden
node sim/run.js optimize --only zoroark --rounds 1 --gens 4 --pop 6 --games 20 --seed 1
node sim/run.js showlog zoroark dragapult 1234 N N
```

`eval` の引数は「相手ごとの試合数」「開始seed」です。結果は標準出力にJSONで表示します。
`optimize` は `ai/params/params_zoroark.js` を書き換え、経過を `sim/results/opt_log.json` に保存します。対戦に使うデッキは `decks/*.json` です。
ゾロアークの価値関数はまだ学習していません。既存の `collect`・`train`・`train-all` はドラパルトとメガレックウザ用です。
従来の `node sim/optimize.js` などのパスは変更しました。今後は `run.js` から実行してください。

再現用の記録生成と復元：

```bash
node sim/run.js record zoroark dragapult 42 --out match42.pokeca.json
node sim/run.js replay match42.pokeca.json --compare-ai
```

評価のデフォルトは各相手1,000試合です。再現用記録の詳細は `../docs/MATCH_LOGS.md` を参照してください。
