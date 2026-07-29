# You Are Not Random

> A rock-paper-scissors opponent that learns your habits using full-information online learning.

人間のじゃんけんに現れる短期的な癖を、24個の予測戦略（expert）と
Hedge / Fixed Shareでオンライン学習する、完全クライアントサイドの研究デモです。

AIは単なる周辺頻度だけでなく、「勝った手を繰り返す」「3手周期」
「直前2手を条件にしたMarkov遷移」などを同時に評価します。Fixed Shareにより、
対戦途中で人間の戦略が変わった場合にも重みを切り替えやすくしています。

## Screenshot

ダークテーマの1ページダッシュボードに、対戦、累積成績、現在の仮説、
24 expertの重み、regret、人間の遷移確率、履歴、設定をまとめています。

スクリーンショットを追加する場合は、`npm run dev` で起動して数ラウンド対戦した後、
幅1,440 px前後で撮影し、`docs/screenshot.png` に保存してください。

## Features

- グー・パー・チョキを大きなボタンで選べるレスポンシブ対戦画面
- 24 expertをfull-informationで毎ラウンド同時採点
- Hedge更新後にFixed Shareを適用（既定 `η = 0.25`, `α = 0.03`）
- `α = 0.00`〜`0.20`の忘却率コントロール
- 学習OFF時は一様ランダム、重みは凍結（履歴と勝敗は保存）
- best fixed expertに対する経験的regret
- Laplace smoothing済みの一次Markov遷移行列
- 最新2,000ラウンドを循環スロットへ、共有統計・expert重み・設定を固定サイズの
  メタデータへ分けてlocalStorageへ保存
- 壊れたJSONや未知schema versionから安全に初期状態へ復旧
- キーボード操作、明示的なfocus、text併記、reduced motion対応
- バックエンド、LLM API、外部DB、状態管理ライブラリ、chartライブラリなし

## Run locally

Node.js 22以降を推奨します。

```bash
npm install
npm run dev
```

Viteが表示するURL（通常は `http://localhost:5173`）を開いてください。

## Test, lint, and build

```bash
npm run lint
npm run test
npm run build
```

開発中のwatch mode:

```bash
npm run test:watch
```

production buildは `dist/` に生成されます。Viteの `base` は `"./"` なので、
リポジトリ名のサブパスを含む静的ホスティングでもasset URLが解決されます。

## Deploy

### GitHub Pages

`.github/workflows/deploy.yml` を含めてdefault branchへpushし、GitHubの
**Settings → Pages → Source** を **GitHub Actions** に設定します。workflowは
lintとtestを通した後に `dist/` をPagesへdeployします。

### Vercel

Vercelでこのリポジトリをimportし、Framework Presetを **Vite** にします。

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`（または既定値）

環境変数やサーバー機能は不要です。

## Round protocol and hidden information

現在ラウンドのAI分布を先に表示すると、人間がそれを見て手を変えられ、
学習対象と評価条件が変わってしまいます。そのため、次の順序を守ります。

1. 完了済みラウンドからインクリメンタル更新した共有統計だけを24 expertへ渡す
2. 各expertの人間予測をAI行動分布へ変換する
3. expert重みで混合する
4. 混合分布からAIの手を内部でサンプリングする
5. 人間が手を選ぶ
6. 使用済みのAIの手と分布を公開する
7. 全3行動の報酬が判明するので、全expertを同時に採点する
8. Hedge / Fixed Share、共有統計、regret統計を1回だけ更新し、ラウンドを保存する
9. 次ラウンドを非公開で準備する

React stateには内部のpending roundがありますが、その分布は人間の選択前には
DOMへrenderしません。画面に出る確率は必ず直前に完了したラウンドのものです。

乱数は `crypto.getRandomValues` を優先し、テストでは決定的な乱数関数を注入します。

## From human prediction to AI play

手の順序は全モジュールで次に統一しています。

```text
[rock, paper, scissors]
```

AI側の利得行列（AIの手が行、人間の手が列）は次です。

```text
[[ 0, -1,  1],
 [ 1,  0, -1],
 [-1,  1,  0]]
```

expertが返す人間の予測分布を `h` とすると、各AI行動の期待利得を
`PAYOFF_MATRIX × h` で計算します。次に安定化softmax（最大値を引いてから指数化）
を取り、5%の一様探索を混ぜます。

$$
q(a) = (1-\epsilon)
\frac{\exp(\beta u_a)}{\sum_b \exp(\beta u_b)}
+ \epsilon \frac{1}{3},
\qquad \beta=5,\ \epsilon=0.05
$$

人間予測が一様なら、AI分布も一様になります。

## Experts

各expertは人間の次の手の確率分布を返します。頻度・Markov推定には
`count + 1` のLaplace smoothingを使い、決め打ち予測も原則
`0.8 / 0.1 / 0.1` に滑らかにしています。

| # | Expert | Prediction |
|---:|---|---|
| 1 | Uniform | 常に一様 |
| 2 | Global Frequency | 全履歴の頻度 |
| 3 | Recent Frequency 5 | 直近5戦の頻度 |
| 4 | Recent Frequency 10 | 直近10戦の頻度 |
| 5 | Recent Frequency 20 | 直近20戦の頻度 |
| 6 | Exponentially Decayed Frequency | 減衰率0.85で最近を重視 |
| 7 | Repeat Last | 直前の手を繰り返す |
| 8 | Cycle Forward | rock → paper → scissors |
| 9 | Cycle Backward | rock → scissors → paper |
| 10 | Avoid Repeat | 直前と違う2手 |
| 11 | Break Two-Hand Streak | 2連続後に別の手 |
| 12 | Break Three-Hand Streak | 3連続後に別の手 |
| 13 | Human Win-Stay | 人間が勝った手を継続 |
| 14 | Human Lose-Shift Forward | 人間が負けた後に順方向へ変更 |
| 15 | Human Lose-Shift Backward | 人間が負けた後に逆方向へ変更 |
| 16 | Human Draw-Repeat | 引き分け後に同じ手 |
| 17 | Counter Last AI Hand | 直前のAIへ勝つ手 |
| 18 | Copy Last AI Hand | 直前のAIの手をコピー |
| 19 | First-Order Markov | 直前1手を条件に推定 |
| 20 | Second-Order Markov | 直前2手を条件に推定 |
| 21 | Third-Order Markov | 直前3手を条件に推定 |
| 22 | Period 2 | 2ラウンド前の手 |
| 23 | Period 3 | 3ラウンド前の手 |
| 24 | Period 4 | 4ラウンド前の手 |

条件付きexpertの条件が成立しない場合はGlobal Frequencyへfallbackします。
Markovは該当contextが2件未満なら
`order 3 → order 2 → order 1 → global → uniform` の順でbackoffします。

## Incremental statistics and complexity

毎ラウンド、全履歴をexpertごとに再走査しません。次の情報を共有状態として
1回だけ更新し、24 expert、成績、遷移行列、regret表示から参照します。

- 全期間・直近5/10/20戦・指数減衰の手の回数
- 1〜3次Markovのcontext別回数
- 直近20手、直近10勝敗、直前ラウンド、手と勝敗のstreak
- 累積勝敗とexpert別累積報酬

expert数を $N$、Markovの最大次数と各window長をこのアプリの定数とすると、
予測、full-information採点、Hedge / Fixed Share、regret更新を含む
1ラウンドの計算量は $\Theta(N)$、対戦履歴の長さに対しては $O(1)$ です。
React stateが保持する表示用履歴も直近15件に制限しています。

学習率はadaptiveにせず `η = 0.25` 固定です。Fixed Shareの `α` も従来どおり
画面から手動設定します。

## Hedge and full information

expert `e` の現在重みを $\pi_{t,e}$、そのexpertから作ったAI行動分布を
$q_{t,e}$ とすると、実際のAI分布は次です。

$$
p_t = \sum_e \pi_{t,e} q_{t,e}
$$

人間の手が確定すると、AIの全3行動に対する報酬ベクトル $g_t$ が分かります。
じゃんけんでは、人間の手さえ見れば、実際に選ばなかったAI行動の勝敗も計算できます。
これがこのアプリでfull-information更新が可能な理由です。

$$
r_{t,e} = q_{t,e}^{\mathsf T}g_t
$$

実際にサンプリングされた手だけでなく、24 expertすべてをこの期待報酬で採点します。

通常のHedge posteriorは:

$$
\pi'_{t+1,e} \propto
\pi_{t,e}\exp(\eta r_{t,e})
$$

## Fixed Share

Hedgeだけでは、一度小さくなったexpertの重みが、人間の戦略変更後に戻るまで
時間がかかることがあります。Fixed Shareは更新後の重みへ一様成分を戻します。

$$
\pi_{t+1,e} =
(1-\alpha)\pi'_{t+1,e} + \frac{\alpha}{N}
$$

- `α = 0`: 通常のHedgeに近い
- 大きい `α`: 最近強くなったexpertへ切り替わりやすい
- 大きすぎる `α`: 過去から学んだ重みを維持しにくい

指数更新はlog-spaceで最大値を引き、更新後とshare後に正規化するため、
長い対戦でもNaN / Infinityを避けます。

## Empirical regret

表示するregretは、学習ONだったラウンドについての期待報酬ベースの
**best fixed expert** 比較です。

$$
\operatorname{bestExpertReward}(T)
= \max_e \sum_t r_{t,e}
$$

$$
\operatorname{algorithmExpectedReward}(T)
= \sum_t \sum_e \pi_{t,e}r_{t,e}
$$

$$
\operatorname{empiricalRegret}(T)
= \operatorname{bestExpertReward}(T)
- \operatorname{algorithmExpectedReward}(T)
$$

実際にサンプリングされた勝敗との差ではありません。混合戦略がラウンドごとに
異なるexpertをうまく組み合わせた場合、regretは負になることもあり、0にclampしません。
またFixed Shareを使っていても、表示値は「切り替わるexpert列」とのtracking regret
ではありません。

## localStorage

メタデータkeyは `you-are-not-random:v2`、schema versionは2です。共有統計、
regret統計、現在の24 expert重み、`α`、学習ON/OFFを、履歴長に依存しない
メタデータとして保存します。

各ラウンドは `you-are-not-random:v2:round:0`〜`:1999` の2,000スロットへ
循環保存します。通常の1ラウンドでは新しいラウンド1件と固定サイズのメタデータ
だけをserializeするため、全履歴の `JSON.stringify` は発生しません。起動時に
React stateへ復元する表示用履歴は最新15件だけです。

各ラウンドには、人間とAIの手、使用済みAI分布、更新前expert重み、全expert報酬、
AIの期待報酬、実際の報酬、学習状態、ID、timestampを保存します。
壊れたJSON、未知version、非有限値、長さが異なるvectorはcache missとして扱い、
アプリを初期状態で起動します。旧schema version 1の保存データは移行せず、
初期状態から開始します。

## Limitations

- このアプリは「人間が必ず予測可能」と主張するものではありません。
- 少ない対戦数ではexpert重みや遷移確率は不安定です。
- 相手が完全にランダムなら、長期的に利用可能な偏りはありません。
- 人間がAIの仕組みを知って適応すると、単純なbest fixed expert比較だけでは
  相互適応を評価できません。
- 表示regretは経験的なbest fixed expertとの比較で、理論保証値やtracking regret
  ではありません。
- Fixed Shareは最近の変化へ追従するための実用的な仕組みですが、
  `α` の最適値を自動推定してはいません。
- データはブラウザlocalStorageだけにあり、端末間同期やバックアップはありません。

## Project structure

```text
src/
  app/         reducer, initialization, page composition
  components/  accessible dashboard cards
  domain/      canonical hands, payoffs, probability types
  engine/      private pending-round protocol and sampling
  learning/    shared incremental stats, experts, Hedge, Fixed Share, regret
  stats/       aggregate match stats and Markov transitions
  storage/     versioned localStorage adapter
  styles/      responsive dark visual system
  test/        shared test setup and fixtures
```

## License

No license has been specified for this repository.
