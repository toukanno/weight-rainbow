import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [];

function addCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(path.join(root, filePath));
}

function extractFirst(text, regex) {
  const m = text.match(regex);
  return m ? m[1] : null;
}

try {
  const pkg = JSON.parse(read('package.json'));
  const xcode = read('ios/App/App.xcodeproj/project.pbxproj');
  const metadata = read('docs/app-store-connect-metadata.md');

  const packageVersion = pkg.version;
  const marketingVersion = extractFirst(xcode, /MARKETING_VERSION = ([^;]+);/);
  const buildVersion = extractFirst(xcode, /CURRENT_PROJECT_VERSION = ([^;]+);/);
  const bundleId = extractFirst(xcode, /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/);

  addCheck(
    'Version alignment (package.json vs MARKETING_VERSION)',
    Boolean(packageVersion && marketingVersion && packageVersion === marketingVersion),
    `package.json=${packageVersion ?? 'N/A'} / MARKETING_VERSION=${marketingVersion ?? 'N/A'}`,
  );

  addCheck(
    'Build number exists in Xcode project',
    Boolean(buildVersion),
    `CURRENT_PROJECT_VERSION=${buildVersion ?? 'N/A'}`,
  );

  addCheck(
    'Bundle Identifier exists in Xcode project',
    Boolean(bundleId),
    `PRODUCT_BUNDLE_IDENTIFIER=${bundleId ?? 'N/A'}`,
  );

  const requiredFiles = [
    'docs/support.html',
    'docs/privacy-policy.html',
    'docs/apple-review-notes.md',
    'docs/submission-checklist.md',
    'ios/App/App/PrivacyInfo.xcprivacy',
    'ios/App/App/Info.plist',
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json',
  ];

  for (const file of requiredFiles) {
    addCheck(`Required file exists: ${file}`, fileExists(file), file);
  }

  const supportUrl = extractFirst(metadata, /Support URL:\s*(.+)/);
  const privacyUrl = extractFirst(metadata, /Privacy Policy URL:\s*(.+)/);

  addCheck(
    'Support URL uses HTTPS',
    Boolean(supportUrl && supportUrl.trim().startsWith('https://')),
    supportUrl ?? 'N/A',
  );

  addCheck(
    'Privacy Policy URL uses HTTPS',
    Boolean(privacyUrl && privacyUrl.trim().startsWith('https://')),
    privacyUrl ?? 'N/A',
  );

  const allOk = checks.every((c) => c.ok);

  console.log('iOS release readiness checks');
  console.log('='.repeat(32));
  for (const c of checks) {
    console.log(`${c.ok ? '✅' : '❌'} ${c.name}`);
    console.log(`   ${c.detail}`);
  }

  if (!allOk) {
    console.error('\nOne or more checks failed.');
    process.exitCode = 1;
  } else {
    console.log('\nAll checks passed.');
  }
} catch (error) {
  console.error('Failed to run release checks:', error.message);
  process.exitCode = 1;
}
