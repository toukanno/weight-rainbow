<p align="center">
  <img src="assets/icon.svg" alt="Rainbow Weight Log" width="120" />
</p>

<h1 align="center">レインボー体重管理</h1>

<p align="center">
  <strong>写真・音声・手入力に対応した、ローカル保存中心の体重管理アプリ</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Web-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/license-Private-lightgrey" alt="License" />
  <img src="https://img.shields.io/badge/lang-日本語%20%7C%20English-green" alt="Language" />
  <img src="https://img.shields.io/badge/tests-770%2B%20passed-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/storage-Local%20First-orange" alt="Storage" />
</p>

---

## 概要

**レインボー体重管理（Rainbow Weight Log）** は、プライバシーを最優先に設計された体重管理アプリです。すべてのデータは端末内に保存され、外部サーバーへの送信は行いません。

手入力・音声入力・写真（体重計のOCR読み取り）の3つの方法で体重を記録でき、BMI計算、トレンド分析、詳細な統計情報をローカルで確認できます。

## 特徴

### 3つの入力方式

| 方式 | 説明 |
|------|------|
| **手入力** | ピッカーUIで整数部・小数部を直感的に選択。クイック調整ボタン（±0.1〜±1.0kg）付き |
| **音声入力** | ブラウザ/ネイティブの音声認識で「ななじゅうにてんご」→ 72.5kg を自動変換 |
| **写真入力** | 体重計の写真からOCRで数値を検出。候補チップから選択 |

### 充実のデータ分析

- **トレンドチャート** — 7日/30日/90日/全期間の体重推移をキャンバスグラフで描画
- **移動平均線** — 7日間の平滑化トレンドラインをオーバーレイ表示
- **BMI分析** — リアルタイムBMI計算、ゾーン分類、適正体重レンジ表示
- **短期トレンド** — 直近3回の平均を前3回と比較し、増減傾向を即座に表示
- **期間別変化ペース** — 7日/30日/90日の変化量と週あたりレートを並列表示
- **目標管理** — 目標体重の設定、進捗バー、達成予測日、カウントダウン
- **カロリー推定** — 体重変化から消費カロリー差を推定
- **体脂肪率トラッキング** — 体脂肪率の記録と推移分析
- **記録カレンダー** — 今月の記録日をカレンダーグリッドで一覧表示
- **週間平均グラフ** — 過去8週間の週平均体重をバーチャートで表示

### 30以上の詳細分析指標

<details>
<summary>すべての分析機能を見る</summary>

| カテゴリ | 機能 |
|----------|------|
| 基本統計 | 平均体重、最新体重、変化量、BMI |
| モメンタム | モメンタムスコア、トレンドインジケーター |
| ストリーク | 連続記録日数、最長記録、ストリーク報酬バッジ |
| 目標 | 進捗率、達成予測、カウントダウン、マイルストーン |
| 曜日分析 | 曜日別平均、曜日別変化、平日vs週末 |
| 安定性 | 体重安定度、変動率、プラトー検出 |
| 分布 | BMI分布、体重分布、パーセンタイル |
| 予測 | トレンド予測、信頼区間、回帰分析 |
| 期間比較 | 今週vs先週、今月vs先月、前半vs後半 |
| ヒートマップ | 12週間の日次変動ヒートマップ |
| マイルストーン | 体重タイムライン、記録回数バッジ |
| タグ分析 | ノートタグ使用頻度、タグ別体重変動 |
| データ品質 | 重複検出、データ鮮度、記録ギャップ分析 |
| 体組成 | 体脂肪率推移、除脂肪体重、体組成変化 |
| シェア | テキストサマリー生成、クリップボードコピー |

</details>

### プライバシー重視の設計

- **ローカル保存** — すべてのデータは `localStorage` に保存。外部送信なし
- **Google Driveバックアップ** — 任意でGoogle Drive AppDataフォルダにバックアップ/復元可能
- **CSV/Excelエクスポート** — データを手元にいつでもダウンロード
- **広告/トラッキングなし** — 広告SDK・分析SDK未導入

### 11種類のカラーテーマ

Prism / Sunrise / Mist / Forest / Lavender / Ocean / Cherry / **Midnight（ダークモード）** / Amber / Rose / Mint

システムのダークモード設定に応じた自動切替にも対応。

### 多言語対応

日本語・英語の完全バイリンガル対応（1,300以上の翻訳キー）。初回起動時に言語を選択。

---

## インストール

### 必要環境

- **Node.js** 18以上
- **npm** 9以上
- iOS ネイティブビルドには **Xcode** 15以上

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/toukanno/weight-rainbow.git
cd weight-rainbow

# 依存パッケージのインストール
npm install

# テスト実行
npm test

# Webビルド
npm run prepare:web
```

### iOS ネイティブビルド

```bash
# Capacitor同期
npm run native:sync

# Xcode で開く
npm run native:open
```

> **Note:** `xcodebuild` でライセンスエラーが出る場合は `sudo xcodebuild -license accept` を実行してください。

---

## 使い方

### 1. プロフィール設定

アプリ起動後、名前・身長・年齢・性別を入力してプロフィールを保存します。身長を入力するとBMI計算が有効になります。

### 2. 体重を記録する

3つの方法から選べます：

- **手入力**: ピッカーで整数部と小数部を選択し「記録」ボタン
- **音声**: マイクボタンを押して体重を読み上げ
- **写真**: カメラ/写真ボタンで体重計の画像を読み込み

### 3. 分析を確認する

記録後、自動的にチャートと統計情報が更新されます。「詳細分析を表示」ボタンで30以上の分析指標を確認できます。

### 4. データ管理

- **エクスポート**: 設定セクションからCSV/Excel形式でダウンロード
- **バックアップ**: Google Driveへの任意バックアップ
- **インポート**: CSV/JSONファイルからのデータ復元

---

## プロジェクト構成

```
weight-rainbow/
├── index.html          # メインHTML + CSS（シングルページ）
├── src/
│   ├── app.js          # UI ロジック・レンダリング・イベント処理
│   ├── logic.js        # ビジネスロジック（純粋関数、2,400行以上）
│   ├── i18n.js         # 日英翻訳（1,300キー以上）
│   └── native-speech.js # ネイティブ音声認識ブリッジ
├── test/
│   └── logic.test.js   # ユニットテスト（770テスト以上）
├── scripts/
│   └── prepare-web.mjs # esbuild バンドルスクリプト
├── ios/                # Capacitor iOS プロジェクト
├── docs/               # ドキュメント
│   ├── PRODUCT.md      # 商品紹介ページ
│   ├── screenshots/    # スクリーンショット
│   ├── app-store-connect-metadata.md
│   ├── apple-review-notes.md
│   └── submission-checklist.md
├── assets/
│   └── icon.svg        # アプリアイコン
├── capacitor.config.json
└── manifest.webmanifest
```

## npm スクリプト

| コマンド | 説明 |
|----------|------|
| `npm test` | Vitest でユニットテスト実行 |
| `npm run test:watch` | テストをウォッチモードで実行 |
| `npm run prepare:web` | esbuild で本番バンドル生成 |
| `npm run check` | テスト + 構文チェック |
| `npm run native:sync` | Web ビルド + Capacitor iOS 同期 |
| `npm run native:open` | Xcode でプロジェクトを開く |

## テスト

```bash
npm test
```

770以上のユニットテストで `logic.js` の全ビジネスロジックをカバー。Vitest を使用。

---

## App Store 提出

提出に必要な情報は以下のドキュメントにまとまっています：

- [App Store Connect メタデータ](./docs/app-store-connect-metadata.md)
- [Apple レビュー用ノート](./docs/apple-review-notes.md)
- [提出チェックリスト](./docs/submission-checklist.md)

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | Vanilla JavaScript（フレームワークなし） |
| バンドラー | esbuild |
| テスト | Vitest（770+ テスト） |
| ネイティブ | Capacitor（iOS） |
| チャート | Canvas 2D（ライブラリなし） |
| ストレージ | localStorage |
| i18n | カスタム翻訳システム |
| エクスポート | xlsx ライブラリ |

---

<p align="center">
  <sub>Built with privacy in mind. All data stays on your device.</sub>
</p>
