const API_BASE_URL = 'http://localhost:8000';  // Your FastAPI server URL
const MACHINE_DETAILS_API_URL = 'http://localhost:8001';  // Machine details API URL
const ECR_API_URL = 'http://localhost:8002';  // ECR API URL
const SUPPLIER_API_URL = 'http://localhost:8003'; 
 // Supplier API URL

export const discussionAPI = {
  // Get all discussions
  getAllDiscussions: async () => {
    try {
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/discussions`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching discussions:', error);
      throw error;
    }
  },

  // Get discussions since a certain time
  getNewDiscussions: async (since) => {
    try {
      const url = since 
        ? `${MACHINE_DETAILS_API_URL}/api/discussions?since=${since}`
        : `${MACHINE_DETAILS_API_URL}/api/discussions`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching discussions:', error);
      throw error;
    }
  },

  // Get discussions after a certain ID
  getDiscussionsAfterId: async (afterId) => {
    try {
      const url = afterId
        ? `${MACHINE_DETAILS_API_URL}/api/discussions?after_id=${afterId}`
        : `${MACHINE_DETAILS_API_URL}/api/discussions`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching discussions:', error);
      throw error;
    }
  },

  // Get parent component hierarchy for a given component ID
  getComponentParents: async (componentId) => {
    try {
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/machine-details/${encodeURIComponent(componentId)}/parents`);
      if (!response.ok) {
        throw new Error('Failed to fetch component parents');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching component parents:', error);
      throw error;
    }
  },

  // Get discussions for a specific component/item ID
  getDiscussionsByItemId: async (itemId) => {
    try {
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/discussions/${encodeURIComponent(itemId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch discussions');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching discussions by item ID:', error);
      throw error;
    }
  },

  // Retrieve engineering discussions
  retrieveEngineeringDiscussions: async () => {
    try {
      const params = new URLSearchParams({
        supplier_search: 'false',
        channel_id: 'C0A2UMDTL8N'
      });
      
      const response = await fetch(`${API_BASE_URL}/api/digest?${params.toString()}`);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to retrieve engineering discussions';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Check if the API returned an error in the response body
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to retrieve engineering discussions');
      }
      
      return data;
    } catch (error) {
      console.error('Error retrieving engineering discussions:', error);
      throw error;
    }
  },

  // Retrieve SCM discussions
  retrieveSCMDiscussions: async () => {
    try {
      const params = new URLSearchParams({
        supplier_search: 'true',
        channel_id: 'C0A2WNBR0MQ'
      });
      
      const response = await fetch(`${API_BASE_URL}/api/digest?${params.toString()}`);
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to retrieve SCM discussions';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Check if the API returned an error in the response body
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to retrieve SCM discussions');
      }
      
      return data;
    } catch (error) {
      console.error('Error retrieving SCM discussions:', error);
      throw error;
    }
  },

  // Update discussion summary
  updateDiscussionSummary: async (discussionId, payload) => {
    try {
      // Ensure all required fields are strings and not empty
      const requestBody = {
        discussion_id: String(discussionId),
        item_id: String(payload.item_id || ''),
        summary: String(payload.summary || ''),
        latest_update: String(payload.latest_update || ''),
        supplier_id: payload.supplier_id ? String(payload.supplier_id) : null
      };

      console.log('Sending update request:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/discussion-summary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update discussion';
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          // FastAPI validation errors are usually in errorData.detail array
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
          } else {
            errorMessage = errorData.detail || errorData.error || errorMessage;
          }
        } catch (e) {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating discussion:', error);
      throw error;
    }
  },

  // Delete discussion summary
  deleteDiscussionSummary: async (discussionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/discussion-summary/${discussionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete discussion';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting discussion:', error);
      throw error;
    }
  }
};

export const machineDetailsAPI = {
  // Get all machine details (components)
  getAllMachineDetails: async (limit) => {
    try {
      const url = limit 
        ? `${MACHINE_DETAILS_API_URL}/api/machine-details?limit=${limit}`
        : `${MACHINE_DETAILS_API_URL}/api/machine-details`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch machine details');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching machine details:', error);
      throw error;
    }
  },

  // Get specific component by item ID
  getComponentById: async (itemId) => {
    try {
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/machine-details?item_id=${encodeURIComponent(itemId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch component details');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching component details:', error);
      throw error;
    }
  },

  // Get children of a component
  getComponentChildren: async (itemId, directOnly = false) => {
    try {
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/machine-details/${encodeURIComponent(itemId)}/children?direct_only=${directOnly}`);
      if (!response.ok) {
        throw new Error('Failed to fetch component children');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching component children:', error);
      throw error;
    }
  },

  // Get parents of a component
  getComponentParents: async (itemId) => {
    try {
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/machine-details/${encodeURIComponent(itemId)}/parents`);
      if (!response.ok) {
        throw new Error('Failed to fetch component parents');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching component parents:', error);
      throw error;
    }
  },

  // Get component impact (affected components)
  getComponentImpact: async (itemId, includeSelf = true, excludeCurrentUsage = true) => {
    try {
      const params = new URLSearchParams();
      params.append('include_self', includeSelf);
      params.append('exclude_current_usage', excludeCurrentUsage);
      
      const response = await fetch(`${MACHINE_DETAILS_API_URL}/api/machine-details/${encodeURIComponent(itemId)}/impact?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch component impact');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching component impact:', error);
      throw error;
    }
  }
};

export const discussionSummaryAPI = {
  // Get discussion summaries, optionally filtered by Component ID
  getDiscussionSummaries: async (componentId = null, limit = null) => {
    try {
      let url = `${API_BASE_URL}/api/discussion-summary`;
      const params = new URLSearchParams();
      
      if (componentId) {
        // Note: The API doesn't directly filter by Component ID, so we'll fetch all and filter client-side
        // Or we can use the discussions endpoint and filter
      }
      
      if (limit) {
        params.append('limit', limit);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch discussion summaries');
      }
      const data = await response.json();
      
      // Filter by Component ID if provided
      if (componentId && data.success && data.data) {
        data.data = data.data.filter(d => 
          (d['Component ID'] === componentId || d.component_id === componentId)
        );
        data.count = data.data.length;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching discussion summaries:', error);
      throw error;
    }
  }
};

export const ecrAPI = {
  // Get all ECRs
  getAllECRs: async () => {
    try {
      const response = await fetch(`${ECR_API_URL}/api/ecr/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch ECRs');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching ECRs:', error);
      throw error;
    }
  },

  // Create ECR document
  createECR: async (discussionIds, additionalDetails) => {
    try {
      const response = await fetch(`${ECR_API_URL}/api/create-ecr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discussion_ids: discussionIds,
          additional_details: additionalDetails || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create ECR');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating ECR:', error);
      throw error;
    }
  },

  // Download ECR document
  downloadECRDocument: async (documentId) => {
    try {
      const response = await fetch(`${ECR_API_URL}/api/ecr/${documentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download ECR document');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecr_${documentId}.docx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
      console.error('Error downloading ECR document:', error);
      throw error;
    }
  }
};

export const supplierAPI = {
  // Get all suppliers
  getAllSuppliers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.supplier_name) params.append('supplier_name', filters.supplier_name);
      if (filters.supplier_type) params.append('supplier_type', filters.supplier_type);
      if (filters.hq_country) params.append('hq_country', filters.hq_country);
      if (filters.status) params.append('status', filters.status);
      if (filters.preferred_supplier_flag !== undefined) params.append('preferred_supplier_flag', filters.preferred_supplier_flag);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      
      const url = `${SUPPLIER_API_URL}/api/suppliers${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  // Get supplier by ID
  getSupplierById: async (supplierId) => {
    try {
      const response = await fetch(`${SUPPLIER_API_URL}/api/suppliers/${encodeURIComponent(supplierId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch supplier');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  },

  // Get components for a supplier
  getSupplierComponents: async (supplierId, contractStatus = null) => {
    try {
      const params = new URLSearchParams();
      if (contractStatus) params.append('contract_status', contractStatus);
      
      const url = `${SUPPLIER_API_URL}/api/suppliers/${encodeURIComponent(supplierId)}/components${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch supplier components');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching supplier components:', error);
      throw error;
    }
  },

  // Get supplier contracts by child_identifier
  getSupplierContractsByChildIdentifier: async (childIdentifier) => {
    try {
      const params = new URLSearchParams();
      params.append('child_identifier', childIdentifier);
      
      const url = `${SUPPLIER_API_URL}/api/supplier-contracts?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch supplier contracts');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching supplier contracts:', error);
      throw error;
    }
  },

  // Get suppliers for a component by child_identifier
  getComponentSuppliers: async (childIdentifier, onlyActiveContracts = false) => {
    try {
      const params = new URLSearchParams();
      if (onlyActiveContracts) {
        params.append('only_active_contracts', 'true');
      }
      
      const url = `${SUPPLIER_API_URL}/api/components/${encodeURIComponent(childIdentifier)}/suppliers${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch component suppliers');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching component suppliers:', error);
      throw error;
    }
  }
};