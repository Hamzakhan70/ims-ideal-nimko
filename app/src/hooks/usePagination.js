import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing pagination state and data fetching
 * 
 * @param {Function} fetchFunction - Function that fetches data (should accept { page, limit, ...filters })
 * @param {Object} initialFilters - Initial filter values
 * @param {Number} initialPageSize - Initial page size (default: 10)
 * @returns {Object} Pagination state and handlers
 */
export function usePagination(fetchFunction, initialFilters = {}, initialPageSize = 10) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    pageSize: initialPageSize,
  });
  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      };
      
      const response = await fetchFunction(params);
      
      // Handle different response formats
      let items = [];
      let paginationData = {};
      
      if (response.data) {
        // Response has data property
        items = response.data.items || response.data.products || response.data.users || 
                response.data.categories || response.data.orders || response.data.recoveries ||
                response.data.shopkeeperOrders || response.data || [];
        paginationData = response.data.pagination || {};
      } else if (Array.isArray(response)) {
        // Response is directly an array
        items = response;
      } else {
        // Response is an object with items
        items = response.items || response.products || response.users || 
                response.categories || response.orders || response.recoveries ||
                response.shopkeeperOrders || [];
        paginationData = response.pagination || {};
      }
      
      // Ensure items is always an array
      if (!Array.isArray(items)) {
        console.warn('usePagination: Expected array but got:', typeof items, items);
        items = [];
      }
      
      setData(items);
      setPagination(prev => ({
        ...prev,
        current: paginationData.current || paginationData.page || prev.current,
        pages: paginationData.pages || paginationData.totalPages || 
               Math.ceil((paginationData.total || items.length) / prev.pageSize) || 1,
        total: paginationData.total || items.length,
      }));
    } catch (err) {
      console.error('Error fetching paginated data:', err);
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pagination.current, pagination.pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = useCallback((page) => {
    setPagination(prev => ({ ...prev, current: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, current: 1 }));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page on filter change
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [initialFilters]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    pagination,
    filters,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    handleFiltersChange,
    clearFilters,
    refresh,
  };
}

