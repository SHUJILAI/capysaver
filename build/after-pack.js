'use strict';

// Ad-hoc sign the macOS .app bundle right after electron-builder packs it,
// but before the DMG is assembled. Apple Silicon refuses to launch
// completely-unsigned binaries with a misleading "is damaged" error, so
// even a signature with the system-generated identity (`-`) is enough to
// avoid that. Users still get the regular Gatekeeper "unidentified
// developer" warning on first launch (right-click Open to bypass).
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const { execSync } = require('child_process');
  const path = require('path');

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  console.log(`[afterPack] ad-hoc signing ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
  execSync(`codesign --verify --verbose=2 "${appPath}"`, { stdio: 'inherit' });
};
