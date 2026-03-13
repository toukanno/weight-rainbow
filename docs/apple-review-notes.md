# Apple Review Notes

## App positioning
- The app is a local-first weight tracker for wellness use.
- BMI and trend charts are reference information only and are not presented as medical diagnosis or treatment advice.
- Personal information handled by the UI is limited to name, height, weight, age, and gender.

## Permission copy candidates
- Photo library / camera: "体重計の写真を読み込み、体重入力を補助するために使用します。画像は端末外へ送信されません。"
- Microphone: "音声で体重を入力するためにマイクを使用します。音声データは端末外へ送信されません。"
- Speech recognition if native wrapper is added: "音声から体重の数値を読み取るために音声認識を使用します。認識結果は端末内の入力補助にのみ使います。"

## Current native implementation status
- Capacitor iOS wrapper is present in `ios/App`.
- `Info.plist` usage descriptions for camera, photo library, microphone, and speech recognition are implemented.
- `PrivacyInfo.xcprivacy` is present with no tracking and no declared collected data.
- App icon and splash assets have been generated into the iOS asset catalog.
- Voice input on iOS uses a local Capacitor plugin implementation under `ios/App/App/Plugins/SpeechRecognition`.

## Review-sensitive areas
- Privacy: current implementation stores data in `localStorage` only and has no external API calls.
- Ads: current repository contains only an ad placeholder UI. No ad SDK or tracking is included yet.
- Tracking: ATT is not required in the current build. Re-evaluate before integrating any ad network SDK.
- Medical claims: keep the disclaimer visible near BMI and avoid language that implies diagnosis, treatment, or clinical accuracy.
- User-generated image/audio handling: photo and voice features are input assistance only and should not claim measurement accuracy.

## Release checklist
- Accept the Xcode license on the target Mac before running `xcodebuild` or Archive.
- Set the Apple Developer Team in Xcode signing settings.
- Prepare App Privacy details to declare local storage and any future ad SDK behavior.
- If ads are introduced later, update consent flow, ATT handling, and privacy disclosures before submission.
