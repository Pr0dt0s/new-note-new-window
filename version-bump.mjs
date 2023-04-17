import { readFileSync, writeFileSync } from 'fs';

const targetVersion = process.env.npm_package_version || process.argv[2];

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '  '));
console.log('manifest.json', JSON.stringify(manifest, null, '  '));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '  '));
console.log('versions.json', JSON.stringify(versions, null, '  '));
