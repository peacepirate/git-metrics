# Frontend Setup Guide

This guide provides detailed instructions for setting up and running the Git Metrics frontend React application.

## Prerequisites

### Required Software
- **Node.js 16 or higher** - [Download Node.js](https://nodejs.org/)
- **npm 8+ or yarn 1.22+** - Package manager (comes with Node.js)

### Verify Installation
```bash
node --version  # Should show v16 or higher
npm --version   # Should show 8 or higher
```

## Installation

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

**Or using Yarn:**
```bash
yarn install
```

This will install:
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `typescript` - Type safety
- `vite` - Build tool
- `echarts` & `echarts-for-react` - Charts
- `axios` - HTTP client
- `tailwindcss` - Styling
- `date-fns` - Date utilities

### 3. Verify Installation
```bash
npm list react
```

## Configuration

### Environment Variables

Create `.env` file in the frontend directory:

```bash
# .env
VITE_API_URL=http://localhost:8000
```

**Note:** Vite requires `VITE_` prefix for environment variables.

### Proxy Configuration

The app is configured to proxy API requests. See `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

This means frontend requests to `/api/*` are forwarded to `http://localhost:8000/api/*`.

## Running the Application

### Development Mode

**Start the development server:**
```bash
npm run dev
```

**Or using Yarn:**
```bash
yarn dev
```

The application will be available at:
- **Local**: http://localhost:5173
- **Network**: http://192.168.x.x:5173 (for testing on other devices)

Features in development mode:
- Hot Module Replacement (HMR) - instant updates without page reload
- Source maps for debugging
- Fast refresh for React components

### Production Build

**Build for production:**
```bash
npm run build
```

This creates an optimized build in the `dist/` directory:
- Minified JavaScript and CSS
- Tree-shaken dependencies
- Optimized assets
- Source maps (if configured)

### Preview Production Build

**Test the production build locally:**
```bash
npm run preview
```

This serves the `dist/` folder at http://localhost:4173

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── pages/          # Page components
│   │   ├── Home.tsx           # Repository management
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── Contributors.tsx   # Contributors analysis
│   │   └── CodeChurn.tsx      # Churn analysis
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # Application entry point
│   ├── api.ts          # API client and endpoints
│   ├── types.ts        # TypeScript type definitions
│   └── index.css       # Global styles with Tailwind
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies and scripts
```

## Development

### Adding a New Page

1. **Create page component:**
```bash
touch src/pages/NewPage.tsx
```

2. **Implement the component:**
```typescript
// src/pages/NewPage.tsx
import { useParams } from 'react-router-dom';

function NewPage() {
  const { repoId } = useParams<{ repoId: string }>();

  return (
    <div>
      <h2 className="text-3xl font-bold">New Page</h2>
      <p>Repository ID: {repoId}</p>
    </div>
  );
}

export default NewPage;
```

3. **Add route in App.tsx:**
```typescript
import NewPage from './pages/NewPage';

// In the Routes component:
<Route path="/new/:repoId" element={<NewPage />} />
```

4. **Add navigation link:**
```typescript
<Link to={`/new/${selectedRepo}`}>New Page</Link>
```

### Adding a New API Endpoint

1. **Update types in `src/types.ts`:**
```typescript
export interface NewMetric {
  id: number;
  value: string;
}
```

2. **Add API function in `src/api.ts`:**
```typescript
export const metricsApi = {
  // ... existing methods

  getNewMetric: (repoId: number) =>
    api.get<NewMetric>(`/metrics/${repoId}/new-metric`),
};
```

3. **Use in component:**
```typescript
import { metricsApi } from '../api';

const [metric, setMetric] = useState<NewMetric | null>(null);

useEffect(() => {
  const loadMetric = async () => {
    const response = await metricsApi.getNewMetric(repoId);
    setMetric(response.data);
  };
  loadMetric();
}, [repoId]);
```

### Adding a New Chart

1. **Install ECharts if needed:**
```bash
npm install echarts echarts-for-react
```

2. **Create chart component:**
```typescript
import ReactECharts from 'echarts-for-react';

const option = {
  title: { text: 'My Chart', textStyle: { color: '#fff' } },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [
    {
      name: 'Data',
      type: 'line',
      data: [120, 200, 150],
      itemStyle: { color: '#3b82f6' },
    },
  ],
};

<ReactECharts option={option} style={{ height: '400px' }} theme="dark" />
```

### Styling with Tailwind CSS

Common utility classes:
```typescript
// Layout
<div className="container mx-auto px-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<div className="flex items-center justify-between">

// Colors (dark theme)
<div className="bg-gray-800 text-white">
<div className="border border-gray-700">
<span className="text-blue-400">Primary</span>

// Spacing
<div className="p-6 m-4">        // padding, margin
<div className="space-y-4">      // vertical spacing between children

// Typography
<h1 className="text-3xl font-bold">
<p className="text-sm text-gray-400">
```

## TypeScript

### Type Checking
```bash
# Check types without building
npm run type-check

# Or add this script to package.json:
"type-check": "tsc --noEmit"
```

### Common Type Patterns

**Component props:**
```typescript
interface MyComponentProps {
  title: string;
  count?: number;  // Optional
  onUpdate: (value: string) => void;
}

function MyComponent({ title, count = 0, onUpdate }: MyComponentProps) {
  // ...
}
```

**API responses:**
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

const response: ApiResponse<User> = await api.get('/user');
```

## Troubleshooting

### Port Already in Use

Change the port in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3000,  // Change to desired port
  },
})
```

Or use environment variable:
```bash
PORT=3000 npm run dev
```

### API Connection Issues

**Check backend is running:**
```bash
curl http://localhost:8000/api/health
```

**Verify proxy configuration** in `vite.config.ts`

**Check browser console** for CORS errors

**Test direct API call:**
```bash
curl http://localhost:8000/api/repositories
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with npm cache clean
npm cache clean --force
npm install
```

### Type Errors

```bash
# Rebuild TypeScript
npm run build

# Check for missing type definitions
npm install --save-dev @types/node
```

### HMR Not Working

1. Check Vite dev server is running
2. Clear browser cache
3. Restart dev server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Build Errors

**Out of memory:**
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Import errors:**
- Check all imports use correct file extensions
- Verify all imported files exist
- Check for circular dependencies

## Performance Optimization

### Code Splitting

Lazy load routes:
```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    <Route path="/dashboard/:repoId" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [react(), visualizer()],
})

# Build and view
npm run build
open stats.html
```

### Image Optimization

Use Vite's asset handling:
```typescript
import logo from './assets/logo.png';  // Imported as URL
<img src={logo} alt="Logo" />
```

## Testing

### Install Testing Libraries
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

### Create Test File
```typescript
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Run Tests
```bash
npm run test
```

## Browser Compatibility

Supported browsers:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

For older browser support, configure in `vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    target: 'es2015',  // Support older browsers
  },
})
```

## Deployment

### Build for Production
```bash
npm run build
```

### Serve Static Files

**Using a simple HTTP server:**
```bash
npm install -g serve
serve -s dist -p 3000
```

**Using Nginx:**
```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/frontend/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:8000;
  }
}
```

### Environment-Specific Builds

Create multiple environment files:
```bash
.env.development   # Used by npm run dev
.env.production    # Used by npm run build
.env.staging       # Custom environment
```

Build for specific environment:
```bash
vite build --mode staging
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t git-metrics-frontend .
docker run -p 80:80 git-metrics-frontend
```

## IDE Setup

### VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Linting & Formatting

### Run ESLint
```bash
npm run lint
```

### Fix ESLint Issues
```bash
npm run lint -- --fix
```

### Setup Prettier
```bash
npm install --save-dev prettier

# Create .prettierrc
echo '{ "semi": true, "singleQuote": true }' > .prettierrc

# Format all files
npx prettier --write "src/**/*.{ts,tsx}"
```

## Quick Reference

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Troubleshooting
rm -rf node_modules && npm install    # Reinstall dependencies
npm cache clean --force               # Clear npm cache

# Deployment
npm run build                         # Create production build
serve -s dist                        # Serve locally
```

## Support

For issues or questions:
1. Check this setup guide
2. Review main README.md
3. Check browser console for errors
4. Verify backend is running
5. Open an issue on GitHub

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Apache ECharts Examples](https://echarts.apache.org/examples/)
- [React Router Documentation](https://reactrouter.com/)
