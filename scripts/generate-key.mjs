import {generateKeyPairSync} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const out = path.resolve('chromium_private_key.pem');
if (fs.existsSync(out)) {
  console.log(`${out} already exists; leaving it unchanged.`);
  process.exit(0);
}
const {privateKey} = generateKeyPairSync('ed25519');
fs.writeFileSync(out, privateKey.export({format:'pem', type:'pkcs8'}));
console.log(`Generated ${out}. Keep this key permanently for IWA updates.`);
