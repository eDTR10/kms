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
import DRRM from './screens/Projects/DRRM';

// Admin
import AdminLayout from './screens/Admin/AdminLayout';
import AdminDashboard from './screens/Admin/AdminDashboard';
import ManageProjects from './screens/Admin/ManageProjects';
import ManageUsers from './screens/Admin/ManageUsers';
import ManageCarousel from './screens/Admin/ManageCarousel';
import ManageSlider from './screens/Admin/ManageSlider';
import ManageAccomplishments from './screens/Admin/ManageAccomplishments';
import ManageAwards from './screens/Admin/ManageAwards';
import ManageHighlights from './screens/Admin/ManageHighlights';
import FreeWifiLayout from './screens/Admin/FreeWifi/FreeWifiLayout';
import FreeWifiHighlights from './screens/Admin/FreeWifi/FreeWifiHighlights';
import FreeWifiCharts from './screens/Admin/FreeWifi/FreeWifiCharts';
import FreeWifiCustomTables from './screens/Admin/FreeWifi/FreeWifiCustomTables';

// Admin — per-project (hardcoded folders, same shape as Admin/FreeWifi/)
import ILCDBLayout from './screens/Admin/ILCDB/ILCDBLayout';
import ILCDBHighlights from './screens/Admin/ILCDB/ILCDBHighlights';
import ILCDBCharts from './screens/Admin/ILCDB/ILCDBCharts';
import ILCDBDatasets from './screens/Admin/ILCDB/ILCDBDatasets';
import EGovLayout from './screens/Admin/EGov/EGovLayout';
import EGovHighlights from './screens/Admin/EGov/EGovHighlights';
import EGovCharts from './screens/Admin/EGov/EGovCharts';
import EGovDatasets from './screens/Admin/EGov/EGovDatasets';
import CybersecurityLayout from './screens/Admin/Cybersecurity/CybersecurityLayout';
import CybersecurityHighlights from './screens/Admin/Cybersecurity/CybersecurityHighlights';
import CybersecurityCharts from './screens/Admin/Cybersecurity/CybersecurityCharts';
import CybersecurityDatasets from './screens/Admin/Cybersecurity/CybersecurityDatasets';
import GovNetLayout from './screens/Admin/GovNet/GovNetLayout';
import GovNetHighlights from './screens/Admin/GovNet/GovNetHighlights';
import GovNetCharts from './screens/Admin/GovNet/GovNetCharts';
import GovNetDatasets from './screens/Admin/GovNet/GovNetDatasets';
import ELGULayout from './screens/Admin/ELGU/ELGULayout';
import ELGUHighlights from './screens/Admin/ELGU/ELGUHighlights';
import ELGUCharts from './screens/Admin/ELGU/ELGUCharts';
import ELGUDatasets from './screens/Admin/ELGU/ELGUDatasets';
import IIDBLayout from './screens/Admin/IIDB/IIDBLayout';
import IIDBHighlights from './screens/Admin/IIDB/IIDBHighlights';
import IIDBCharts from './screens/Admin/IIDB/IIDBCharts';
import IIDBDatasets from './screens/Admin/IIDB/IIDBDatasets';
import NIPPSBLayout from './screens/Admin/NIPPSB/NIPPSBLayout';
import NIPPSBHighlights from './screens/Admin/NIPPSB/NIPPSBHighlights';
import NIPPSBCharts from './screens/Admin/NIPPSB/NIPPSBCharts';
import NIPPSBDatasets from './screens/Admin/NIPPSB/NIPPSBDatasets';
import DRRMLayout from './screens/Admin/DRRM/DRRMLayout';
import DRRMHighlights from './screens/Admin/DRRM/DRRMHighlights';
import DRRMCharts from './screens/Admin/DRRM/DRRMCharts';
import DRRMDatasets from './screens/Admin/DRRM/DRRMDatasets';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login (no main layout) */}
        <Route path="/kms/login" element={<Login />} />

        {/* Full-screen kiosk display (no navbar/footer) */}
   

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
        {/* ILCDB */}
        <Route path="/kms/admin/ilcdb/highlights" element={<ProtectedRoute adminOnly><AdminLayout><ILCDBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<ILCDBHighlights />} />
        </Route>
        <Route path="/kms/admin/ilcdb/charts" element={<ProtectedRoute adminOnly><AdminLayout><ILCDBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<ILCDBCharts />} />
        </Route>
        <Route path="/kms/admin/ilcdb/datasets" element={<ProtectedRoute adminOnly><AdminLayout><ILCDBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<ILCDBDatasets />} />
        </Route>

        {/* eGov */}
        <Route path="/kms/admin/egov/highlights" element={<ProtectedRoute adminOnly><AdminLayout><EGovLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<EGovHighlights />} />
        </Route>
        <Route path="/kms/admin/egov/charts" element={<ProtectedRoute adminOnly><AdminLayout><EGovLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<EGovCharts />} />
        </Route>
        <Route path="/kms/admin/egov/datasets" element={<ProtectedRoute adminOnly><AdminLayout><EGovLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<EGovDatasets />} />
        </Route>

        {/* Cybersecurity / PNPKI */}
        <Route path="/kms/admin/cybersecurity/highlights" element={<ProtectedRoute adminOnly><AdminLayout><CybersecurityLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<CybersecurityHighlights />} />
        </Route>
        <Route path="/kms/admin/cybersecurity/charts" element={<ProtectedRoute adminOnly><AdminLayout><CybersecurityLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<CybersecurityCharts />} />
        </Route>
        <Route path="/kms/admin/cybersecurity/datasets" element={<ProtectedRoute adminOnly><AdminLayout><CybersecurityLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<CybersecurityDatasets />} />
        </Route>

        {/* NBP / CDO GovNet */}
        <Route path="/kms/admin/govnet/highlights" element={<ProtectedRoute adminOnly><AdminLayout><GovNetLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<GovNetHighlights />} />
        </Route>
        <Route path="/kms/admin/govnet/charts" element={<ProtectedRoute adminOnly><AdminLayout><GovNetLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<GovNetCharts />} />
        </Route>
        <Route path="/kms/admin/govnet/datasets" element={<ProtectedRoute adminOnly><AdminLayout><GovNetLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<GovNetDatasets />} />
        </Route>

        {/* eLGU */}
        <Route path="/kms/admin/elgu/highlights" element={<ProtectedRoute adminOnly><AdminLayout><ELGULayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<ELGUHighlights />} />
        </Route>
        <Route path="/kms/admin/elgu/charts" element={<ProtectedRoute adminOnly><AdminLayout><ELGULayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<ELGUCharts />} />
        </Route>
        <Route path="/kms/admin/elgu/datasets" element={<ProtectedRoute adminOnly><AdminLayout><ELGULayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<ELGUDatasets />} />
        </Route>

        {/* IIDB */}
        <Route path="/kms/admin/iidb/highlights" element={<ProtectedRoute adminOnly><AdminLayout><IIDBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<IIDBHighlights />} />
        </Route>
        <Route path="/kms/admin/iidb/charts" element={<ProtectedRoute adminOnly><AdminLayout><IIDBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<IIDBCharts />} />
        </Route>
        <Route path="/kms/admin/iidb/datasets" element={<ProtectedRoute adminOnly><AdminLayout><IIDBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<IIDBDatasets />} />
        </Route>

        {/* NIPPSB */}
        <Route path="/kms/admin/nippsb/highlights" element={<ProtectedRoute adminOnly><AdminLayout><NIPPSBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<NIPPSBHighlights />} />
        </Route>
        <Route path="/kms/admin/nippsb/charts" element={<ProtectedRoute adminOnly><AdminLayout><NIPPSBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<NIPPSBCharts />} />
        </Route>
        <Route path="/kms/admin/nippsb/datasets" element={<ProtectedRoute adminOnly><AdminLayout><NIPPSBLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<NIPPSBDatasets />} />
        </Route>

        {/* DRRM */}
        <Route path="/kms/admin/drrm/highlights" element={<ProtectedRoute adminOnly><AdminLayout><DRRMLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<DRRMHighlights />} />
        </Route>
        <Route path="/kms/admin/drrm/charts" element={<ProtectedRoute adminOnly><AdminLayout><DRRMLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<DRRMCharts />} />
        </Route>
        <Route path="/kms/admin/drrm/datasets" element={<ProtectedRoute adminOnly><AdminLayout><DRRMLayout /></AdminLayout></ProtectedRoute>}>
          <Route index element={<DRRMDatasets />} />
        </Route>

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
        <Route
          path="/kms/admin/slider"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageSlider /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/accomplishments"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageAccomplishments /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/awards"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageAwards /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/highlights"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><ManageHighlights /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kms/admin/free-wifi/highlights"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><FreeWifiLayout /></AdminLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<FreeWifiHighlights />} />
        </Route>
        <Route
          path="/kms/admin/free-wifi/charts"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><FreeWifiLayout /></AdminLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<FreeWifiCharts />} />
        </Route>
        <Route
          path="/kms/admin/free-wifi/datasets"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout><FreeWifiLayout /></AdminLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<FreeWifiCustomTables />} />
        </Route>

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
                <Route path="/kms/projects/drrm" element={<DRRM />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
