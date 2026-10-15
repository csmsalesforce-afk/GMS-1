import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
// ONLY target applicantPortalAppNew to keep the old applicantPortalApp untouched
const staticResourcePath = path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'staticresources', 'applicantPortalAppNew');

console.log('🚀 Deploying new React build to Salesforce Static Resource (applicantPortalAppNew)...');

if (!fs.existsSync(distPath)) {
  console.error('❌ dist folder not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(staticResourcePath)) {
  fs.mkdirSync(staticResourcePath, { recursive: true });
  console.log('✅ Created staticresources/applicantPortalAppNew folder');
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

// Clear existing in applicantPortalAppNew
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

// Copy new build into applicantPortalAppNew ONLY
copyRecursive(distPath, staticResourcePath);
console.log('✅ Files copied to staticresources/applicantPortalAppNew');

const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/zip</contentType>
    <description>Applicant Portal React Application (New)</description>
</StaticResource>`;

const metaXmlPath = path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'staticresources', 'applicantPortalAppNew.resource-meta.xml');
fs.writeFileSync(metaXmlPath, metaXml);
console.log('✅ Created/Updated applicantPortalAppNew.resource-meta.xml');
console.log('🎉 Deployment to static resources complete!');
