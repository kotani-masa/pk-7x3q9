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
| `results/` | 評価結果。要点は `summary.json`。各コマンドの出力もここに保存される |
| `docs/` | デッキ書き出しの説明 |
| `baselines/v6/` | 比較用に凍結したv6のAI一式。`rivals` の相手（ゾロアーク）と旧版の比較に使う。変更しない |

## よく使うコマンド

```bash
node sim/run.js test
node sim/run.js eval 1000 40000
node sim/run.js verify-info
node sim/run.js verify-hidden
node sim/run.js optimize --only zoroark --rounds 1 --gens 4 --pop 6 --games 20 --seed 1
node sim/run.js showlog zoroark dragapult 1234
```

`eval` の引数は「相手ごとの試合数」「開始seed」です。結果は標準出力にJSONで表示します。
`optimize` は `ai/params/params_zoroark.js` を書き換え、経過を `sim/results/opt_log.json` に保存します。対戦に使うデッキは `decks/*.json` です。
ゾロアークの価値関数はまだ学習していません。既存の `collect`・`train`・`train-all` はドラパルトとメガレックウザ用です。

再現用の記録生成と復元：

```bash
node sim/run.js record zoroark dragapult 42 --out match42.pokeca.json
node sim/run.js replay match42.pokeca.json --compare-ai
```

評価のデフォルトは各相手1,000試合です。再現用記録の詳細は `../docs/DEVELOPMENT.md` の「対戦の記録と再現」を参照してください。

## 固定v6相手への対抗AI調整

`node sim/run.js rivals train` で候補を選別し、`node sim/run.js rivals eval` で旧新を比較します。相手のゾロアークは常に `baselines/v6/` の凍結版を読み込むため、`ai/decks/ai_zoroark.js` を更新しても比較条件は変わりません。`train` はパラメータファイルを上書きします。手順と過去の結果は `../docs/DEVELOPMENT.md` と `../docs/CHANGELOG.md` を参照してください。
