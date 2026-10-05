# Applicant Portal React Application

A React-based applicant portal for Grant Management System that integrates with Salesforce as a managed package.

## Features

- 🏠 **Home Page** - Landing page with hero section and program information
- 📋 **Programs Listing** - Browse available grant programs
- 📝 **Program Details** - View detailed program information
- 📄 **Application Management** - Create and manage grant applications
- 👤 **Profile Management** - Manage organization profile
- 🔐 **Salesforce Integration** - Dynamic connection to any Salesforce org

## Tech Stack

- React 19
- React Router DOM
- Vite (Build Tool)
- Salesforce LWC Integration

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will run on `http://localhost:5173`

### Building for Salesforce

```bash
npm run build:sf
```

This command will:
1. Build the React app for production
2. Copy the build files to Salesforce static resources
3. Create/update the meta.xml file

### Deploying to Salesforce

After building, deploy to Salesforce:

```bash
sfdx force:source:push
```

Or using SF CLI:

```bash
sf project deploy start
```

## Architecture

### Salesforce Integration

The app communicates with Salesforce through global window objects set by the LWC component:

- `window.__APPLICANT_PORTAL_MOUNT__` - DOM node to mount React app
- `window.__APPLICANT_PORTAL_ACTIONS__` - Salesforce API methods
- `window.__APPLICANT_PORTAL_DATA__` - Initial data (auth state, user info)
- `window.__APPLICANT_PORTAL_ASSETS__` - Static resource URLs
- `window.__APPLICANT_PORTAL_SITE_PREFIX__` - Site URL prefix
- `window.__APPLICANT_PORTAL_RENDER__` - Callback for re-rendering

### Project Structure

```
src/
├── components/         # Reusable components
│   └── Navbar.jsx
├── contexts/          # React contexts
│   └── AuthContext.jsx
├── pages/             # Page components
│   ├── Home.jsx
│   ├── Programs.jsx
│   ├── ProgramDetails.jsx
│   ├── MyApplications.jsx
│   └── Profile.jsx
├── services/          # Service layer
│   └── salesforceService.js
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

### Salesforce Service

The `salesforceService.js` abstracts all Salesforce API calls:

```javascript
import salesforceService from './services/salesforceService';

// Profile APIs
await salesforceService.getCurrentUserProfile();
await salesforceService.submitProfileForApproval(recordId);

// Program APIs
await salesforceService.getPrograms();
await salesforceService.getProgramById(programId);

// Application APIs
await salesforceService.getMyApplications();
await salesforceService.saveApplication(app);
await salesforceService.submitApplication(appId);

// File Management
await salesforceService.uploadFile(fileName, base64Data, recordId);
await salesforceService.deleteFile(documentId);
```

## Customization

### Branding

Update the assets in the LWC component (`applicantPortalReact.js`):

```javascript
window.__APPLICANT_PORTAL_ASSETS__ = {
  logoLightUrl: 'your-logo-url',
  logoDarkUrl: 'your-logo-url',
  heroImage: 'hero-image-url',
  // ... other assets
};
```

### Styling

- Modify CSS files in `src/pages/` and `src/components/`
- Update colors in individual component CSS files
- Brand colors are currently set to Salesforce blue (#0176d3)

### Adding New Features

1. Create new page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/Navbar.jsx`
4. Add Salesforce API method in `src/services/salesforceService.js`

## Managed Package Compatibility

This React app is designed to work as a managed package:

✅ **Org-Agnostic** - No hardcoded org URLs
✅ **Dynamic API Calls** - All calls go through Salesforce service
✅ **Site Prefix Support** - Works with any community/site URL
✅ **Asset Management** - Uses Salesforce static resources

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:sf` - Build and copy to Salesforce
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `npm run dev`
4. Build and test with Salesforce: `npm run build:sf`
5. Submit a pull request

## License

Proprietary - Grant Management System

## Support

For issues and questions, please contact the development team.
