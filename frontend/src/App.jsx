import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import ToolListPage from './pages/ToolListPage'
import SettingsPage from './pages/SettingsPage'
import AddToolPage from './pages/AddToolPage'
import ToolDetailPage from './pages/ToolDetailPage'
import BatteryListPage from './pages/BatteryListPage'
import AddBatteryPage from './pages/AddBatteryPage'
import BatteryDetailPage from './pages/BatteryDetailPage'
import ImportPage from './pages/ImportPage'
import ExportPage from './pages/ExportPage'
import AnalyticsPage from './pages/AnalyticsPage'
import KitListPage from './pages/KitListPage'
import KitDetailPage from './pages/KitDetailPage'
import AddKitPage from './pages/AddKitPage'

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/tools" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/tools" element={<ToolListPage />} />
            <Route path="/tools/new" element={<AddToolPage />} />
            <Route path="/tools/:id" element={<ToolDetailPage />} />
            <Route path="/tools/:id/edit" element={<AddToolPage />} />
            <Route path="/batteries" element={<BatteryListPage />} />
            <Route path="/batteries/new" element={<AddBatteryPage />} />
            <Route path="/batteries/:id" element={<BatteryDetailPage />} />
            <Route path="/batteries/:id/edit" element={<AddBatteryPage />} />
            <Route path="/kits" element={<KitListPage />} />
            <Route path="/kits/new" element={<AddKitPage />} />
            <Route path="/kits/:id" element={<KitDetailPage />} />
            <Route path="/kits/:id/edit" element={<AddKitPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
