# Deployment Guide - Applicant Portal React

## Quick Deploy to Salesforce

### Step 1: Build the React App
```bash
cd applicant-portal-react
npm run build:sf
```

This will:
1. Build the React app for production
2. Copy files to `force-app/main/default/staticresources/applicantPortalApp/`
3. Create/update the `.resource-meta.xml` file

### Step 2: Deploy to Salesforce

#### Using SFDX
```bash
cd ..
sfdx force:source:push
```

#### Using SF CLI
```bash
cd ..
sf project deploy start
```

#### Using VS Code
1. Right-click on `force-app/main/default/staticresources/applicantPortalApp`
2. Select "Deploy Source to Org"

### Step 3: Add LWC to Your Site

1. **Go to Experience Builder**
   - Setup → Digital Experiences → All Sites
   - Click "Builder" on your site

2. **Add the LWC Component**
   - Navigate to the page where you want the portal
   - Drag the `applicantPortalReact` component to the page
   - Publish the site

3. **Test the Portal**
   - Visit your site URL
   - The React app should load with your Salesforce data!

## Verify Integration

### Check if Data is Flowing

Open browser console and check:
```javascript
// These should be populated
window.__APPLICANT_PORTAL_DATA__
window.__APPLICANT_PORTAL_ACTIONS__
window.__APPLICANT_PORTAL_ASSETS__
```

### Test API Calls

In the React app:
- Navigate to Programs page → Should show your Grant Programs
- Click "My Applications" → Should show user's applications
- Visit Profile page → Should load user profile

## Troubleshooting

### React App Not Loading
1. Check static resource deployed: Setup → Static Resources → applicantPortalApp
2. Verify LWC component exists: Setup → Lightning Components → applicantPortalReact
3. Check browser console for errors

### No Data Showing
1. Verify Apex classes are deployed
2. Check user has proper permissions
3. Verify Field Level Security on custom objects

### Styling Issues
1. Clear browser cache
2. Check if CSS file loaded: Network tab → index.css
3. Verify static resource cache control is set to "Public"

## Making Changes

### Update React App
```bash
cd applicant-portal-react
npm run dev           # Test locally
npm run build:sf      # Build and deploy
cd ..
sfdx force:source:push
```

### Test Locally (Without Salesforce)
```bash
cd applicant-portal-react
npm run dev
```
Visit http://localhost:5173

**Note:** Local testing won't have real Salesforce data. Mock the data in `salesforceService.js` for local development.

## Managed Package Deployment

This app is designed to work as a managed package:

1. **Org-Agnostic**: Works in any Salesforce org
2. **No Hardcoded URLs**: Uses dynamic site prefix
3. **Dynamic Assets**: References static resources dynamically
4. **Apex Integration**: All data from Apex controllers

### For Managed Package
1. Include in package:
   - Static Resource: `applicantPortalApp`
   - LWC Component: `applicantPortalReact`
   - All referenced Apex classes
   - Custom objects and fields

2. Subscriber orgs will:
   - Install the package
   - Add LWC to their Experience Cloud site
   - It will automatically connect to their org data

## Security Checklist

- ✅ LWC component has proper `@api` properties
- ✅ Apex classes have `with sharing`
- ✅ Field Level Security configured
- ✅ Experience Cloud site permissions set
- ✅ Guest user profile configured (if needed)

## Performance Tips

1. **Enable Caching**: Static resource cache control = "Public"
2. **Lazy Loading**: React Router already implements code splitting
3. **Minimize Apex Calls**: React app caches data in state
4. **Optimize Images**: Use compressed images in static resources

## Support

For issues:
1. Check browser console
2. Check Salesforce debug logs
3. Verify all Apex methods are accessible to site user profile
