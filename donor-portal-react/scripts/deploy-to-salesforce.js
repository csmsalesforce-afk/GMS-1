import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const staticResourcePath = path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'staticresources', 'donorPortalApp');

console.log('🚀 Deploying Donor Portal React build to Salesforce Static Resource (donorPortalApp)...');

if (!fs.existsSync(distPath)) {
  console.error('❌ dist folder not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(staticResourcePath)) {
  fs.mkdirSync(staticResourcePath, { recursive: true });
  console.log('✅ Created staticresources/donorPortalApp folder');
}

const copyRecursive = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

// Clear existing in donorPortalApp
if (fs.existsSync(staticResourcePath)) {
  fs.readdirSync(staticResourcePath).forEach((file) => {
    const filePath = path.join(staticResourcePath, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  });
}

// Copy new build into donorPortalApp
copyRecursive(distPath, staticResourcePath);
console.log('✅ Files copied to staticresources/donorPortalApp');

const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/zip</contentType>
    <description>Donor Portal React Application Bundle</description>
</StaticResource>`;

const metaXmlPath = path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'staticresources', 'donorPortalApp.resource-meta.xml');
fs.writeFileSync(metaXmlPath, metaXml);
console.log('✅ Generated donorPortalApp.resource-meta.xml');
console.log('🎉 Static resource deployment complete!');
