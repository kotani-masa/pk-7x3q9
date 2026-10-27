# ポケカエミュレータ ＋ Nのゾロアークex AI

配布版v6：ジャミングタワーを別のスタジアムに貼り替え、どうぐの復活・無料にげる・しはいのくさり・アドレナブレインから攻撃を成立させるルートを評価します。

本体は添付の最新版 `index (2)(1).html` を使用しています。

## CPUと対戦する

フォルダを展開し、`index.html` を開きます。CPU戦で相手にNのゾロアークexデッキを選ぶと専用AIが動きます。`ai` フォルダは本体と同じ場所に置いてください。

## フォルダの役割

| 場所 | 内容 |
|---|---|
| `index.html` | エミュレータ本体 |
| `ai/` | 対戦中に読み込むAI。サブフォルダ別の説明は `ai/README.md` |
| `debug/` | 1試合分の再現用記録とソース指紋 |
| `sim/` | 開発用の自動対戦・テスト・学習ツール。CPU戦だけなら実行不要 |
| `docs/` | ゾロアークAIの説明、従来のAI設計資料、Windows向け説明 |

## AIを検証する

Node.jsで、このフォルダから実行します。追加パッケージのインストールは不要です。

```bash
node sim/run.js test
node sim/run.js eval 1000 40000
node sim/run.js optimize --only zoroark --rounds 1 --gens 4 --pop 6 --games 20
```

コマンド一覧は `node sim/run.js help`、詳しい使い方は `sim/README.md`、AIの対応範囲と検証結果は `docs/ZOROARK.md` を参照してください。

CPU対戦の記録は、バトルログの「解析用ログを保存」から取得できます。次の試合開始時に前の記録が消えます。記録の復元とAI比較は `docs/MATCH_LOGS.md` を参照してください。
