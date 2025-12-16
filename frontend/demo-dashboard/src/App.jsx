import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import DiscussionFeed from './components/DiscussionFeed'
import ComponentsPage from './components/ComponentsPage'
import ComponentDetail from './components/ComponentDetail'
import SuppliersPage from './components/SuppliersPage'
import SupplierDetail from './components/SupplierDetail'
import SCDiscussionDetails from './components/SCDiscussionDetails'
import DTDiscussionDetails from './components/DTDiscussionDetails'
import ECRDiscussionDetails from './components/ECRDiscussionDetails'

function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>
      <DiscussionFeed refreshTrigger={refreshTrigger} />
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
          <Route path="/ecr/:documentId/details" element={<ECRDiscussionDetails />} />
          <Route path="/sc-discussion/:discussionId" element={<SCDiscussionDetails />} />
          <Route path="/dt-discussion/:discussionId" element={<DTDiscussionDetails />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
