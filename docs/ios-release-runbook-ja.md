# iOSリリース実行ランブック（日本語）

このドキュメントは、`weight-rainbow` を App Store Connect へ提出する直前〜提出完了までの実行手順です。

## 1. 事前準備（ローカル）

```bash
npm install
npm run check
npm run native:sync
npm run release:ios:check
```

- `npm run check`: テストと主要JS構文チェック
- `npm run native:sync`: Web成果物をiOSプロジェクトへ同期
- `npm run release:ios:check`: バージョン整合・必須ファイル・公開URL形式の自動確認

## 2. Xcode側確認

1. `npm run native:open` で Xcode を開く
2. Target `App` を選択し、以下を確認
   - Team
   - Bundle Identifier
   - Version / Build
3. `Product > Build` を実行
4. 実機で以下の許可フローを再確認
   - カメラ
   - 写真ライブラリ
   - マイク
   - 音声認識

## 3. Archive と Upload

1. 実行先を `Any iOS Device (arm64)` に変更
2. `Product > Archive`
3. Organizer で `Validate App`（表示される場合）
4. `Distribute App` から App Store Connect へアップロード

## 4. App Store Connect 最終入力

- メタデータは `docs/app-store-connect-metadata.md` を基準に入力
- レビュー用コメントは `docs/apple-review-notes.md` を貼り付けて必要箇所のみ調整
- `Support URL` / `Privacy Policy URL` の公開確認
- 価格・配信地域・年齢レーティングの最終確認

## 5. 提出前ゲート

以下がすべて満たされるまで提出しない:

- [ ] `npm run check` が成功
- [ ] `npm run release:ios:check` が成功
- [ ] Xcode `Product > Build` が成功
- [ ] 実機で主要権限フローを確認
- [ ] スクリーンショット（必要デバイス/言語）登録済み
- [ ] App Privacy 回答が現行ビルドと一致
