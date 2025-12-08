import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import SignPage from './pages/SignPage';
import CalibratePage from './pages/CalibratePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/sign/:token" element={<SignPage />} />
        <Route path="/calibrate" element={<CalibratePage />} />
        <Route path="/" element={<AdminPage />} />
        {/* Documentation is served as static files at /docs/* - React Router doesn't handle it */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

