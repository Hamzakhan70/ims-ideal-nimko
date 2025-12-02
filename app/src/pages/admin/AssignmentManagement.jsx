import React, {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {api} from '../../utils/api';
import Pagination from '../../components/common/Pagination';
import {usePagination} from '../../hooks/usePagination';

export default function AssignmentManagement() {
    const [salesmen, setSalesmen] = useState([]);
    const [shopkeepers, setShopkeepers] = useState([]);
    const [cities, setCities] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({salesmanId: '', cityId: '', notes: ''});
    const [searchTerm, setSearchTerm] = useState('');
    const [salesmanFilter, setSalesmanFilter] = useState('');
    const [shopkeeperFilter, setShopkeeperFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');

    // Fetch function for pagination hook
    const fetchAssignments = useCallback(async (params) => {
        const token = localStorage.getItem('adminToken');
        const queryParams = new URLSearchParams({
            page: params.page,
            limit: params.limit,
            ...(params.search && {
                search: params.search
            }),
            ...(params.salesmanId && {
                salesmanId: params.salesmanId
            }),
            ...(params.shopkeeperId && {
                shopkeeperId: params.shopkeeperId
            }),
            ...(params.city && {
                city: params.city
            })
        });

        const response = await axios.get(`${
            api.assignments.getAll()
        }?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response;
    }, []);

    // Use pagination hook
    const {
        data: assignments,
        loading,
        pagination,
        handlePageChange,
        handlePageSizeChange,
        handleFilterChange,
        refresh: refreshAssignments
    } = usePagination(fetchAssignments, {
        search: '',
        salesmanId: '',
        shopkeeperId: '',
        city: ''
    }, 20);

    useEffect(() => {
        fetchDropdownData();
        fetchCities();
    }, []);

    // Update filters when they change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleFilterChange('search', searchTerm);
        }, searchTerm ? 500 : 0);

        return() => clearTimeout(timeoutId);
    }, [searchTerm, handleFilterChange]);

    useEffect(() => {
        handleFilterChange('salesmanId', salesmanFilter);
    }, [salesmanFilter, handleFilterChange]);

    useEffect(() => {
        handleFilterChange('shopkeeperId', shopkeeperFilter);
    }, [shopkeeperFilter, handleFilterChange]);

    useEffect(() => {
        handleFilterChange('city', cityFilter);
    }, [cityFilter, handleFilterChange]);

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (! token) 
                return;
            


            const [salesmenResponse, shopkeepersResponse] = await Promise.all([
                axios.get(api.assignments.getAvailableSalesmen(), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                axios.get(api.assignments.getAvailableShopkeepers(), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ]);

            setSalesmen(salesmenResponse.data.salesmen || []);
            setShopkeepers(shopkeepersResponse.data.shopkeepers || []);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    const fetchCities = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (! token) 
                return;
            


            const response = await axios.get(api.cities.getAll(), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setCities(response.data.cities || []);
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.post(api.assignments.create(), formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const message = response.data.message || 'Assignment created successfully!';
            alert(message);
            setShowForm(false);
            setFormData({salesmanId: '', cityId: '', notes: ''});
            refreshAssignments();
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Error creating assignment: ' + (
                error.response ?. data ?. error || error.message
            ));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeactivate = async (assignmentId) => {
        if (!confirm('Are you sure you want to deactivate this assignment?')) {
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(api.assignments.delete(assignmentId), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            alert('Assignment deactivated successfully!');
            refreshAssignments();
        } catch (error) {
            console.error('Error deactivating assignment:', error);
            alert('Error deactivating assignment: ' + (
                error.response ?. data ?. error || error.message
            ));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading assignments...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Shop-Salesman Assignments</h1>
                <button onClick={
                        () => setShowForm(true)
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Create New Assignment
                </button>
            </div>

            {/* Assignment Form Modal */}
            {
            showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Assign City to Salesman</h2>
                        <form onSubmit={handleSubmit}
                            className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Salesman
                                </label>
                                <select value={
                                        formData.salesmanId
                                    }
                                    onChange={
                                        (e) => setFormData({
                                            ...formData,
                                            salesmanId: e.target.value
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required>
                                    <option value="">Choose a salesman...</option>
                                    {
                                    salesmen.map(salesman => (
                                        <option key={
                                                salesman._id
                                            }
                                            value={
                                                salesman._id
                                        }>
                                            {
                                            salesman.name
                                        }
                                            - {
                                            salesman.email
                                        } </option>
                                    ))
                                } </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select City
                                </label>
                                <select value={
                                        formData.cityId
                                    }
                                    onChange={
                                        (e) => setFormData({
                                            ...formData,
                                            cityId: e.target.value
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required>
                                    <option value="">Choose a city...</option>
                                    {
                                    cities.map(city => (
                                        <option key={
                                                city._id
                                            }
                                            value={
                                                city._id
                                        }>
                                            {
                                            city.name
                                        } </option>
                                    ))
                                } </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    All shopkeepers in this city will be assigned to the selected salesman.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea value={
                                        formData.notes
                                    }
                                    onChange={
                                        (e) => setFormData({
                                            ...formData,
                                            notes: e.target.value
                                        })
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Any additional notes..."/>
                            </div>

                            <div className="flex space-x-3">
                                <button type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50">
                                    {
                                    submitting ? 'Creating...' : 'Create Assignment'
                                } </button>
                                <button type="button"
                                    onClick={
                                        () => setShowForm(false)
                                    }
                                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
        }

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                        <input type="text" placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={
                                (e) => setSearchTerm(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Salesman</label>
                        <select value={salesmanFilter}
                            onChange={
                                (e) => setSalesmanFilter(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                            <option value="">All Salesmen</option>
                            {
                            salesmen.map(salesman => (
                                <option key={
                                        salesman._id
                                    }
                                    value={
                                        salesman._id
                                }>
                                    {
                                    salesman.name
                                }
                                    - {
                                    salesman.email
                                } </option>
                            ))
                        } </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shopkeeper</label>
                        <select value={shopkeeperFilter}
                            onChange={
                                (e) => setShopkeeperFilter(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                            <option value="">All Shopkeepers</option>
                            {
                            shopkeepers.map(shopkeeper => (
                                <option key={
                                        shopkeeper._id
                                    }
                                    value={
                                        shopkeeper._id
                                }>
                                    {
                                    shopkeeper.name
                                }
                                    - {
                                    shopkeeper.email
                                } </option>
                            ))
                        } </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <select value={cityFilter}
                            onChange={
                                (e) => setCityFilter(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500">
                            <option value="">All Cities</option>
                            {
                            cities.map(city => (
                                <option key={
                                        city._id
                                    }
                                    value={
                                        city._id
                                }>
                                    {
                                    city.name
                                } </option>
                            ))
                        } </select>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {
                loading ? (
                    <div className="text-center py-8 text-gray-500">
                        Loading assignments...
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No assignments found. Create your first assignment above.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Salesman
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Shopkeeper
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Assigned By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Assigned Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Notes
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {
                                assignments.map((assignment) => (
                                    <tr key={
                                        assignment._id
                                    }>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {
                                                    assignment.salesmanId ?. name
                                                } </div>
                                                <div className="text-sm text-gray-500">
                                                    {
                                                    assignment.salesmanId ?. email
                                                } </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {
                                                    assignment.shopkeeperId ?. name
                                                } </div>
                                                <div className="text-sm text-gray-500">
                                                    {
                                                    assignment.shopkeeperId ?. email
                                                } </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {
                                            assignment.assignedBy ?. name
                                        } </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {
                                            new Date(assignment.assignedAt).toLocaleDateString()
                                        } </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {
                                            assignment.notes || '-'
                                        } </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={
                                                    () => handleDeactivate(assignment._id)
                                                }
                                                className="text-red-600 hover:text-red-900">
                                                Deactivate
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            } </tbody>
                        </table>
                    </div>
                )
            } </div>

            {/* Pagination */}
            {
            !loading && assignments.length > 0 && (
                <Pagination currentPage={
                        pagination.current
                    }
                    totalPages={
                        pagination.pages
                    }
                    totalItems={
                        pagination.total
                    }
                    pageSize={
                        pagination.pageSize
                    }
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}/>
            )
        } </div>
    );
}
