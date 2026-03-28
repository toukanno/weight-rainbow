# Submission Checklist

## Implemented in this repository
- [x] Weight entry by manual input, voice input, and photo-assisted input
- [x] BMI display with non-medical disclaimer
- [x] Local-first storage with no external API calls
- [x] Japanese and English UI copy
- [x] Theme and display settings
- [x] Review notes for permissions, ads, and medical-risk wording
- [x] Responsive single-page layout suitable for iPhone, iPad, and macOS browser sizes
- [x] Capacitor iOS wrapper for iPhone and iPad
- [x] Native iOS permission strings, privacy manifest, app icon, and splash assets
- [x] Local iOS speech recognition plugin and native camera integration
- [x] Privacy policy page (ja/en) at `docs/privacy-policy.html`
- [x] Support page (ja/en) with FAQ at `docs/support.html`
- [x] GitHub Pages index page at `docs/index.html`
- [x] App Store Connect metadata finalized with URLs and SKU (`docs/app-store-connect-metadata.md`)
- [x] PrivacyInfo.xcprivacy updated with UserDefaults API declaration
- [x] UIRequiredDeviceCapabilities updated to arm64
- [x] All 1194 tests passing
- [x] Web assets built and synced to iOS via Capacitor
- [x] Version aligned: package.json 1.0.0, Xcode MARKETING_VERSION 1.0.0, BUILD 1

## Still requires manual native-app work
- [ ] Enable GitHub Pages: repo Settings > Pages > main branch, `/docs` folder
- [ ] Accept the local Xcode license if `xcodebuild` has not been initialized on this Mac
- [ ] Apple signing, archive, upload, and App Store Connect metadata entry
- [ ] Real-device verification inside the actual iOS/iPadOS/macOS wrapper
- [ ] Capture App Store screenshots (6.7" iPhone, 5.5" iPhone, 12.9" iPad) in ja and en

## Recommended final manual checks
- [ ] Confirm microphone and photo flows on iPhone and iPad hardware
- [ ] Confirm keyboard, pointer, and window resizing on macOS
- [ ] Verify App Privacy answers match the final wrapper and any future ad SDK choice
- [ ] Confirm the app is allowed for Apple Silicon Macs as a Designed for iPad app unless a dedicated Catalyst/macOS target is later added

## Before archive
- [ ] `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` has been run on the release Mac
- [ ] Xcode target `App` has the correct Team (F6WLVDWAYF), bundle identifier (com.weightrainbow.app), version (1.0.0), and build number (1)
- [ ] Xcode `Product > Build` completes successfully with signing enabled
- [ ] Real-device permissions have been rechecked for camera, photo library, microphone, and speech recognition
- [x] `docs/app-store-connect-metadata.md` has final URLs and release copy filled in

## Archive and upload
- [ ] Select `Any iOS Device (arm64)` or a valid generic iOS destination in Xcode
- [ ] Run `Product > Archive`
- [ ] In Organizer, validate the archive before upload if Xcode offers the option
- [ ] Upload the archive to App Store Connect
- [ ] Confirm the uploaded build appears under the correct app record and version

## After upload
- [ ] Attach the uploaded build to the App Store Connect version
- [ ] Fill Promotional Text, Description, Keywords, Support URL, Privacy Policy URL, and optional Marketing URL
- [ ] Review App Privacy answers against the current native implementation
- [ ] Paste the review notes from `docs/apple-review-notes.md` and adjust only if the shipped build differs
- [ ] Verify category, age rating, pricing, and availability before submission
