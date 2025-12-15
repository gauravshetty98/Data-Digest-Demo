import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DiscussionFeed from './components/DiscussionFeed'
import ComponentsPage from './components/ComponentsPage'
import ComponentDetail from './components/ComponentDetail'
import SuppliersPage from './components/SuppliersPage'
import SupplierDetail from './components/SupplierDetail'
import ECRReview from './components/ECRReview'

function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Engineering Discussion Feed</h1>
      <DiscussionFeed />
    </div>
  )
}

function Analytics() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics</h1>
      <p className="text-gray-600">Analytics page content goes here.</p>
    </div>
  )
}

function Settings() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
      <p className="text-gray-600">Settings page content goes here.</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/components/:itemId" element={<ComponentDetail />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/:supplierId" element={<SupplierDetail />} />
          <Route path="/ecr/:documentId/review" element={<ECRReview />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
