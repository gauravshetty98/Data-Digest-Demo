export default function SupplierCard({ supplier, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {supplier.supplier_name || 'Unnamed Supplier'}
          </h3>
        </div>
        {supplier.preferred_supplier_flag === 1 && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
            Preferred
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        {supplier.supplier_type && (
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-2 text-gray-900">{supplier.supplier_type}</span>
          </div>
        )}
        {supplier.hq_country && (
          <div>
            <span className="text-gray-500">Country:</span>
            <span className="ml-2 text-gray-900">{supplier.hq_country}</span>
          </div>
        )}
        {supplier.status && (
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 ${
              supplier.status === 'Active' ? 'text-green-600' : 
              supplier.status === 'Inactive' ? 'text-gray-600' : 
              'text-red-600'
            }`}>
              {supplier.status}
            </span>
          </div>
        )}
        {supplier.risk_rating && (
          <div>
            <span className="text-gray-500">Risk Rating:</span>
            <span className="ml-2 text-gray-900">{supplier.risk_rating}</span>
          </div>
        )}
      </div>
    </div>
  )
}
