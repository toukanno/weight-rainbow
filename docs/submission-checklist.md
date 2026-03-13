# Submission Checklist

## Implemented in this repository
- Weight entry by manual input, voice input, and photo-assisted input
- BMI display with non-medical disclaimer
- Local-first storage with no external API calls
- Japanese and English UI copy
- Theme and display settings
- Review notes for permissions, ads, and medical-risk wording
- Responsive single-page layout suitable for iPhone, iPad, and macOS browser sizes
- Capacitor iOS wrapper for iPhone and iPad
- Native iOS permission strings, privacy manifest, app icon, and splash assets
- Local iOS speech recognition plugin and native camera integration

## Still requires manual native-app work
- Accept the local Xcode license if `xcodebuild` has not been initialized on this Mac
- Apple signing, archive, upload, and App Store Connect metadata entry
- Real-device verification inside the actual iOS/iPadOS/macOS wrapper

## Recommended final manual checks
- Confirm microphone and photo flows on iPhone and iPad hardware
- Confirm keyboard, pointer, and window resizing on macOS
- Verify App Privacy answers match the final wrapper and any future ad SDK choice
- Confirm the app is allowed for Apple Silicon Macs as a Designed for iPad app unless a dedicated Catalyst/macOS target is later added

## Before archive
- `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` has been run on the release Mac
- Xcode target `App` has the correct Team, bundle identifier, version, and build number
- Xcode `Product > Build` completes successfully with signing enabled
- Real-device permissions have been rechecked for camera, photo library, microphone, and speech recognition
- `docs/app-store-connect-metadata.md` has final URLs and release copy filled in
- Optional: run the CLI build command only if you want an additional terminal-side verification

## Archive and upload
- Select `Any iOS Device (arm64)` or a valid generic iOS destination in Xcode
- Run `Product > Archive`
- In Organizer, validate the archive before upload if Xcode offers the option
- Upload the archive to App Store Connect
- Confirm the uploaded build appears under the correct app record and version

## After upload
- Attach the uploaded build to the App Store Connect version
- Fill Promotional Text, Description, Keywords, Support URL, Privacy Policy URL, and optional Marketing URL
- Review App Privacy answers against the current native implementation
- Paste the review notes from `docs/apple-review-notes.md` and adjust only if the shipped build differs
- Verify category, age rating, pricing, and availability before submission
