# Issue: 365日でストリーク計算が頭打ちになる

## 概要
- 連続記録日数を数えるループが `365` 回で固定されているため、366日以上連続で記録していてもストリークが `365` を超えません。
- 同じ制約が共有テキスト生成側にもあり、表示・共有されるストリーク値も実際より小さくなります。

## 影響範囲
- 連続記録の表示
- ストリーク依存のモチベーション表示
- 共有テキスト内のストリーク値

## 再現手順
1. 今日を含めて366日以上連続した `records` を用意する
2. `calcStreak(records)` を実行する
3. 返り値が `365` で止まることを確認する

## 期待結果
- 366日以上連続していれば、実際の連続日数をそのまま返す

## 実際の結果
- 365日を超える連続記録でも `365` で打ち止めになる

## 原因
- `calcStreak()` が `for (let i = 0; i < 365; i++)` で探索上限を固定している
- `calcShareText()` でも同じ `365` 固定ループを使っている
- 一方で `calcStreakRewards()` は `while (true)` で実データの切れ目まで数えるため、同じストリーク系機能でも結果が不一致になる

## 該当箇所
- `calcStreak`: `/Users/masayoshiyuuto/codex/weight-rainbow/src/logic.js:323`
- `calcShareText`: `/Users/masayoshiyuuto/codex/weight-rainbow/src/logic.js:5078`
- 比較対象 `calcStreakRewards`: `/Users/masayoshiyuuto/codex/weight-rainbow/src/logic.js:1638`

## 備考
- 既存テストは短いストリークのみを検証しており、365日超のケースをカバーしていません
- `calcStreak` の既存テスト: `/Users/masayoshiyuuto/codex/weight-rainbow/test/logic.test.js:458`
