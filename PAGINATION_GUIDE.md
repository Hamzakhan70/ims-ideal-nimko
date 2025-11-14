 # Centralized Pagination System Guide

This guide explains how to use the centralized DataTable and Pagination components across all admin pages.

## Components

### 1. DataTable Component (`app/src/components/common/DataTable.jsx`)

A reusable table component that displays data with loading states, empty states, and custom rendering.

**Props:**
- `columns` (Array): Column definitions
- `data` (Array): Data to display
- `rowKey` (String|Function): Key for React keys (default: '_id')
- `loading` (Boolean): Loading state
- `emptyMessage` (String): Message when no data
- `rowActions` (Function): Function that returns action buttons for each row
- `onRowClick` (Function): Callback when row is clicked
- `className` (String): Additional CSS classes

**Column Definition:**
```javascript
{
  key: 'name',                    // Unique key
  header: 'Product Name',          // Column header
  accessor: (row) => row.name,    // Function to get value (optional)
  render: (row, index) => <span>{row.name}</span>, // Custom render (optional)
  className: 'text-left',         // Cell CSS class (optional)
  headerClassName: 'text-left',   // Header CSS class (optional)
}
```

### 2. Pagination Component (`app/src/components/common/Pagination.jsx`)

A reusable pagination component with page size selector.

**Props:**
- `currentPage` (Number): Current page number
- `totalPages` (Number): Total number of pages
- `totalItems` (Number): Total number of items
- `pageSize` (Number): Items per page
- `pageSizeOptions` (Array): Available page sizes (default: [10, 20, 50, 100])
- `onPageChange` (Function): Callback when page changes
- `onPageSizeChange` (Function): Callback when page size changes
- `showPageSizeSelector` (Boolean): Show page size selector (default: true)
- `showInfo` (Boolean): Show "Showing X to Y of Z" info (default: true)

### 3. usePagination Hook (`app/src/hooks/usePagination.js`)

A custom hook that manages pagination state and data fetching.

**Parameters:**
- `fetchFunction`: Async function that accepts `{ page, limit, ...filters }` and returns data
- `initialFilters`: Initial filter values (default: {})
- `initialPageSize`: Initial page size (default: 10)

**Returns:**
```javascript
{
  data: [],                    // Current page data
  loading: boolean,            // Loading state
  error: Error | null,         // Error state
  pagination: {                // Pagination info
    current: 1,
    pages: 1,
    total: 0,
    pageSize: 10
  },
  filters: {},                 // Current filters
  handlePageChange: (page) => void,
  handlePageSizeChange: (pageSize) => void,
  handleFilterChange: (key, value) => void,
  handleFiltersChange: (filters) => void,
  clearFilters: () => void,
  refresh: () => void
}
```

## Usage Example

### Step 1: Create a fetch function

```javascript
const fetchProducts = async (params) => {
  const token = localStorage.getItem('adminToken');
  const queryParams = new URLSearchParams({
    page: params.page,
    limit: params.limit,
    ...(params.search && { search: params.search }),
    ...(params.category && { category: params.category }),
  });

  const response = await axios.get(`${api.products.getAll()}?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response;
};
```

### Step 2: Use the hook

```javascript
import { usePagination } from '../../hooks/usePagination';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';

const {
  data: products,
  loading,
  pagination,
  filters,
  handlePageChange,
  handlePageSizeChange,
  handleFilterChange,
} = usePagination(fetchProducts, { search: '', category: '' }, 20);
```

### Step 3: Define columns

```javascript
const columns = [
  {
    key: 'name',
    header: 'Product Name',
    accessor: (product) => product.name,
  },
  {
    key: 'price',
    header: 'Price',
    render: (product) => `PKR ${product.price}`,
  },
  {
    key: 'stock',
    header: 'Stock',
    accessor: (product) => product.stock,
  },
];
```

### Step 4: Render components

```javascript
<DataTable
  columns={columns}
  data={products}
  loading={loading}
  rowActions={(product) => (
    <div className="flex gap-2">
      <button onClick={() => handleEdit(product)}>Edit</button>
      <button onClick={() => handleDelete(product._id)}>Delete</button>
    </div>
  )}
  emptyMessage="No products found."
/>

<Pagination
  currentPage={pagination.current}
  totalPages={pagination.pages}
  totalItems={pagination.total}
  pageSize={pagination.pageSize}
  onPageChange={handlePageChange}
  onPageSizeChange={handlePageSizeChange}
/>
```

## API Response Format

The hook expects one of these response formats:

**Format 1: Standard API response**
```javascript
{
  data: {
    products: [...],  // or users, categories, orders, etc.
    pagination: {
      current: 1,
      pages: 5,
      total: 100
    }
  }
}
```

**Format 2: Direct array**
```javascript
[...]  // Array of items
```

**Format 3: Object with items**
```javascript
{
  products: [...],
  pagination: { ... }
}
```

## Updating Existing Pages

### Products Management
- ✅ API already supports pagination (`page`, `limit` parameters)
- Update to use `usePagination` hook
- Replace grid with DataTable or keep grid with pagination

### Users Management
- Need to add pagination to API route
- Update to use `usePagination` hook
- Use DataTable component

### Categories Management
- Need to add pagination to API route
- Update to use `usePagination` hook
- Use DataTable component

### Orders Management
- Check if API supports pagination
- Update to use `usePagination` hook
- Use DataTable component

## Benefits

1. **Consistency**: All pages use the same pagination UI
2. **Maintainability**: Changes to pagination logic happen in one place
3. **Performance**: Only loads data for current page
4. **User Experience**: Standard pagination controls across the app
5. **Reusability**: Easy to add pagination to new pages

## Next Steps

1. Update ProductManagement to use new components
2. Update UserManagement to use new components
3. Update CategoryManagement to use new components
4. Update OrderManagement to use new components
5. Ensure all API routes support pagination parameters

