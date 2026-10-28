import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.error('❌ dist folder not found. Run "npm run build" first.');
  process.exit(1);
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

const targetFolders = ['applicantPortalAppNew', 'applicantPortalApp'];

for (const folderName of targetFolders) {
  const staticResourcePath = path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'staticresources', folderName);
  console.log(`🚀 Deploying new React build to Salesforce Static Resource (${folderName})...`);

  if (!fs.existsSync(staticResourcePath)) {
    fs.mkdirSync(staticResourcePath, { recursive: true });
    console.log(`✅ Created staticresources/${folderName} folder`);
  }

  // Clear existing files in target folder
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

  // Copy new build into target folder
  copyRecursive(distPath, staticResourcePath);
  console.log(`✅ Files copied to staticresources/${folderName}`);

  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">
    <cacheControl>Public</cacheControl>
    <contentType>application/zip</contentType>
    <description>Applicant Portal React Application</description>
</StaticResource>`;

  const metaXmlPath = path.join(__dirname, '..', '..', 'force-app', 'main', 'default', 'staticresources', `${folderName}.resource-meta.xml`);
  fs.writeFileSync(metaXmlPath, metaXml);
  console.log(`✅ Created/Updated ${folderName}.resource-meta.xml`);
}

console.log('🎉 Deployment to all static resources complete!');
