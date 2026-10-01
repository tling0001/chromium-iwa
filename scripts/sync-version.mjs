import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifestPath = path.join(root, 'src', '.well-known', 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const repo = process.env.GITHUB_REPOSITORY || pkg.repository?.url?.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/)?.[1] || 'OWNER/REPOSITORY';
manifest.version = pkg.version;
manifest.update_manifest_url = `https://github.com/${repo}/releases/latest/download/update_manifest.json`;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const tag = process.env.IWA_RELEASE_TAG || pkg.version;
const asset = process.env.IWA_RELEASE_ASSET || 'chromium.swbn';
const update = {
  versions: [{
    version: pkg.version,
    src: `https://github.com/${repo}/releases/download/${tag}/${asset}`
  }]
};
fs.writeFileSync(path.join(root, 'update_manifest.json'), JSON.stringify(update, null, 2) + '\n');
console.log(`Chromium IWA version: ${pkg.version}`);
console.log(`Update manifest: ${update.versions[0].src}`);
