import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Screens (formerly Pages)
import Home from './screens/Home';
import AboutUs from './screens/AboutUs';
import Maps from './screens/Maps';
import AFD from './screens/AFD';
import Login from './screens/Login';

// Projects
import FreeWifi from './screens/Projects/FreeWifi';
import ILCDB from './screens/Projects/ILCDB';
import EGov from './screens/Projects/EGov';
import Cybersecurity from './screens/Projects/Cybersecurity';
import GovNet from './screens/Projects/GovNet';
import ELGU from './screens/Projects/ELGU';
import IIDB from './screens/Projects/IIDB';
import NIPPSB from './screens/Projects/NIPPSB';

// Admin
import AdminLayout from './screens/Admin/AdminLayout';
import AdminDashboard from './screens/Admin/AdminDashboard';
import ManageProjects from './screens/Admin/ManageProjects';
import ManageUsers from './screens/Admin/ManageUsers';
import ManageCarousel from './screens/Admin/ManageCarousel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login (no main layout) */}
        <Route path="/kms/login" element={<Login />} />

        {/* Admin routes (own layout) */}
        <Route
          path="/kms/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/projects"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageProjects /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageUsers /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/carousel"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageCarousel /></AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Main portal routes */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/kms" element={<Home />} />
                <Route path="/kms/about" element={<AboutUs />} />
                <Route path="/kms/maps" element={<Maps />} />
                <Route path="/kms/afd" element={<AFD />} />
                <Route path="/kms/projects/free-wifi" element={<FreeWifi />} />
                <Route path="/kms/projects/ilcdb" element={<ILCDB />} />
                <Route path="/kms/projects/egov" element={<EGov />} />
                <Route path="/kms/projects/cybersecurity" element={<Cybersecurity />} />
                <Route path="/kms/projects/govnet" element={<GovNet />} />
                <Route path="/kms/projects/elgu" element={<ELGU />} />
                <Route path="/kms/projects/iidb" element={<IIDB />} />
                <Route path="/kms/projects/nippsb" element={<NIPPSB />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
