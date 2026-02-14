import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';
import { ErrorFallback } from './components/ui/ErrorFallback';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { TrackPage } from './pages/TrackPage';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';

function App() {
  return (
    <>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#141414',
            border: '1px solid #2a2a2a',
            color: '#f5f5f5',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
      <Router>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/track/:shareableId" element={<TrackPage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-4xl font-bold mb-4">404</h1><p className="text-studio-text-secondary">Page not found</p></div></div>} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </>
  );
}

export default App;
