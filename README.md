# Weight Rainbow

Local-first weight tracking app with manual, voice, and photo-assisted entry.

## Web
- `npm install`
- `npm run check`

## Native wrapper
- `npm run native:sync`
- `npm run native:open`
- If `xcodebuild` stops with a license error, run `sudo xcodebuild -license accept` once in Terminal
- If `xcodebuild` points at Command Line Tools instead of Xcode, run `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
- Optional CLI build verification if you want a terminal-only check:
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphoneos -destination generic/platform=iOS CODE_SIGNING_ALLOWED=NO build`

## Current native scope
- Capacitor iOS wrapper is included for iPhone and iPad
- macOS support is intended through Apple Silicon "Designed for iPad" distribution unless you later add a dedicated Catalyst/macOS target

## Before App Store submission
- Confirm microphone and photo permissions on real devices
- Set signing, team, bundle metadata, and archive in Xcode
- Review [docs/apple-review-notes.md](./docs/apple-review-notes.md) and [docs/submission-checklist.md](./docs/submission-checklist.md)
- Prepare App Store Connect fields from [docs/app-store-connect-metadata.md](./docs/app-store-connect-metadata.md)

## Manual release flow
- In Xcode, confirm `Signing & Capabilities` for target `App`
- Run one final `Product > Build` with your signing identity enabled
- Archive from `Product > Archive`
- Upload from Organizer
- Fill the remaining App Store Connect metadata, URLs, privacy answers, and review notes
