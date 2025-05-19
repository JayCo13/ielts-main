import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PowerOff, Home, ChevronRight, Plus, Edit, Eye, Trash2, AlertTriangle, Power } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';
import EditAccessDialog from '../../components/dialogs/EditAccessDialog';
import { Toaster, toast } from 'react-hot-toast';

const ManageTest = () => {
    const [tests, setTests] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [testsPerPage] = useState(7);
    const [isEditAccessDialogOpen, setIsEditAccessDialogOpen] = useState(false);
    const [testToEdit, setTestToEdit] = useState(null);
    const [selectedAccessTypes, setSelectedAccessTypes] = useState([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState(null);
    const [testToDeactivate, setTestToDeactivate] = useState(null);
    const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
    const [testToActivate, setTestToActivate] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        sortBy: 'created_at',
        type: 'all',
        status: 'all'  // Add status filter
    });

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            const response = await fetch('http://localhost:8000/admin/ielts-exams', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            const data = await response.json();
            setTests(data);
        } catch (error) {
            console.error('Error fetching tests:', error);
        }
    };
    const handleUpdateAccess = async (examId) => {
        try {
            const response = await fetch(`http://localhost:8000/admin/ielts-exams/${examId}/access`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    access_types: selectedAccessTypes
                })
            });

          
            if (response.ok) {
                setIsEditAccessDialogOpen(false);
                fetchTests();
                toast.success('Access types updated successfully', {
                    style: {
                        background: '#10B981',
                        color: '#FFFFFF',
                    },
                });
            } else {
                const data = await response.json();
                toast.error(data.detail || 'Failed to update access types', {
                    style: {
                        background: '#EF4444',
                        color: '#FFFFFF',
                    },
                });
            }
        } catch (error) {
            console.error('Error updating access types:', error);
            toast.error('Failed to update access types'); // Add error handling
        }
    };
    const handleDelete = async (examId) => {
        try {
            const response = await fetch(`http://localhost:8000/admin/delete-test/${examId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                setTests(tests.filter(test => test.exam_id !== examId));
                setIsDeleteDialogOpen(false);
            }
        } catch (error) {
            console.error('Error deleting test:', error);
        }
    };
    const handleActivate = async (examId) => {
        try {
            const response = await fetch(`http://localhost:8000/admin/ielts-exams/${examId}/status?active=true`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update the test status in the local state
                setTests(tests.map(test =>
                    test.exam_id === examId ? { ...test, is_active: true } : test
                ));
                setIsActivateDialogOpen(false);
            }
        } catch (error) {
            console.error('Error activating test:', error);
        }
    };
    const handleDeactivate = async (examId) => {
        try {
            const response = await fetch(`http://localhost:8000/admin/ielts-exams/${examId}/status?active=false`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update the test status in the local state
                setTests(tests.map(test =>
                    test.exam_id === examId ? { ...test, is_active: false } : test
                ));
                setIsDeactivateDialogOpen(false);
            }
        } catch (error) {
            console.error('Error deactivating test:', error);
        }
    };

    const filteredTests = tests
        .filter(test =>
            test.title.toLowerCase().includes(filters.search.toLowerCase()) &&
            (filters.status === 'all' ||
                (filters.status === 'active' && test.is_active) ||
                (filters.status === 'inactive' && !test.is_active))
        )
        .sort((a, b) => {
            if (filters.sortBy === 'title') {
                return a.title.localeCompare(b.title);
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });

    const indexOfLastTest = currentPage * testsPerPage;
    const indexOfFirstTest = indexOfLastTest - testsPerPage;
    const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);
    const totalPages = Math.ceil(filteredTests.length / testsPerPage);
    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            <Toaster position="top-right" />
            {/* Header */}
            <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-lg m-2">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center space-x-2">
                            <Link to="/" className="text-gray-400 hover:text-violet-600 transition-colors">
                                <Home size={20} />
                            </Link>
                            <ChevronRight size={20} className="text-gray-400" />
                            <span className="text-violet-600 dark:text-violet-400">
                                Manage Tests
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Filters */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Search by test title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sort By
                        </label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="created_at">Date Created</option>
                            <option value="title">Title</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tests Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase border-b dark:border-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800">
                                <th className="px-6 py-4">Test Title</th>
                                <th className="px-6 py-4">Created Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {currentTests.map((test) => (
                                <tr key={test.exam_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-medium text-gray-700 dark:text-gray-200">
                                            {test.title}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {format(new Date(test.created_at), 'dd MMM yyyy, HH:mm')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${test.is_active
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            }`}>
                                            {test.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-4">
                                            <button className="text-violet-600 hover:text-violet-700" title="View Test">
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            <button
                                                className="text-blue-600 hover:text-blue-700"
                                                title="Edit Access"
                                                onClick={() => {
                                                    setTestToEdit(test.exam_id);
                                                    setSelectedAccessTypes(test.access_types || []);
                                                    setIsEditAccessDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-5 w-5" />
                                            </button>
                                            {test.is_active ? (
                                                <button
                                                    onClick={() => {
                                                        setTestToDeactivate(test.exam_id);
                                                        setIsDeactivateDialogOpen(true);
                                                    }}
                                                    className="text-amber-600 hover:text-amber-700"
                                                    title="Deactivate Test"
                                                >
                                                    <Power className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setTestToActivate(test.exam_id);
                                                            setIsActivateDialogOpen(true);
                                                        }}
                                                        className="text-green-600 hover:text-green-700"
                                                        title="Activate Test"
                                                    >
                                                        <PowerOff className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setTestToDelete(test.exam_id);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                        className="text-red-600 hover:text-red-700"
                                                        title="Delete Test"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <EditAccessDialog
                        isOpen={isEditAccessDialogOpen}
                        onClose={() => setIsEditAccessDialogOpen(false)}
                        onUpdate={() => handleUpdateAccess(testToEdit)}
                        selectedAccessTypes={selectedAccessTypes}
                        setSelectedAccessTypes={setSelectedAccessTypes}
                        examId={testToEdit}
                    />
                    {/* Activate Dialog */}
                    <Transition appear show={isActivateDialogOpen} as={React.Fragment}>
                        <Dialog
                            as="div"
                            className="relative z-50"
                            onClose={() => setIsActivateDialogOpen(false)}
                        >
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="fixed inset-0 bg-black bg-opacity-25" />
                            </Transition.Child>

                            <div className="fixed inset-0 overflow-y-auto">
                                <div className="flex min-h-full items-center justify-center p-4 text-center">
                                    <Transition.Child
                                        as={React.Fragment}
                                        enter="ease-out duration-300"
                                        enterFrom="opacity-0 scale-95"
                                        enterTo="opacity-100 scale-100"
                                        leave="ease-in duration-200"
                                        leaveFrom="opacity-100 scale-100"
                                        leaveTo="opacity-0 scale-95"
                                    >
                                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                                <PowerOff className="h-5 w-5 text-green-500 mr-2" />
                                                Activate Test
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Are you sure you want to activate this test? Students will be able to access it.
                                                </p>
                                            </div>

                                            <div className="mt-4 flex space-x-4">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                                                    onClick={() => handleActivate(testToActivate)}
                                                >
                                                    Activate
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                                                    onClick={() => setIsActivateDialogOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>
                    {/* Deactivate Dialog */}
                    <Transition appear show={isDeactivateDialogOpen} as={React.Fragment}>
                        <Dialog
                            as="div"
                            className="relative z-50"
                            onClose={() => setIsDeactivateDialogOpen(false)}
                        >
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="fixed inset-0 bg-black bg-opacity-25" />
                            </Transition.Child>

                            <div className="fixed inset-0 overflow-y-auto">
                                <div className="flex min-h-full items-center justify-center p-4 text-center">
                                    <Transition.Child
                                        as={React.Fragment}
                                        enter="ease-out duration-300"
                                        enterFrom="opacity-0 scale-95"
                                        enterTo="opacity-100 scale-100"
                                        leave="ease-in duration-200"
                                        leaveFrom="opacity-100 scale-100"
                                        leaveTo="opacity-0 scale-95"
                                    >
                                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                                                Deactivate Test
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Are you sure you want to deactivate this test? Students will no longer be able to access it.
                                                </p>
                                            </div>

                                            <div className="mt-4 flex space-x-4">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                                                    onClick={() => handleDeactivate(testToDeactivate)}
                                                >
                                                    Deactivate
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                                                    onClick={() => setIsDeactivateDialogOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>

                    {/* Delete Dialog */}
                    <Transition appear show={isDeleteDialogOpen} as={React.Fragment}>
                        <Dialog
                            as="div"
                            className="relative z-50"
                            onClose={() => setIsDeleteDialogOpen(false)}
                        >
                            <Transition.Child
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="fixed inset-0 bg-black bg-opacity-25" />
                            </Transition.Child>

                            <div className="fixed inset-0 overflow-y-auto">
                                <div className="flex min-h-full items-center justify-center p-4 text-center">
                                    <Transition.Child
                                        as={React.Fragment}
                                        enter="ease-out duration-300"
                                        enterFrom="opacity-0 scale-95"
                                        enterTo="opacity-100 scale-100"
                                        leave="ease-in duration-200"
                                        leaveFrom="opacity-100 scale-100"
                                        leaveTo="opacity-0 scale-95"
                                    >
                                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                                <Trash2 className="h-5 w-5 text-red-500 mr-2" />
                                                Delete Test
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Are you sure you want to permanently delete this test? This action cannot be undone and all associated data will be lost.
                                                </p>
                                            </div>

                                            <div className="mt-4 flex space-x-4">
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                                    onClick={() => handleDelete(testToDelete)}
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                                                    onClick={() => setIsDeleteDialogOpen(false)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </Dialog.Panel>
                                    </Transition.Child>
                                </div>
                            </div>
                        </Dialog>
                    </Transition>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {indexOfFirstTest + 1} to {Math.min(indexOfLastTest, filteredTests.length)} of {filteredTests.length} tests
                        </div>
                        <div className="flex space-x-2">
                            {/* Previous button */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded-md ${currentPage === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                &lt;
                            </button>

                            {/* First page */}
                            {currentPage > 3 && (
                                <>
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                    >
                                        1
                                    </button>
                                    {currentPage > 4 && (
                                        <span className="px-2 py-1 text-gray-500 dark:text-gray-400">...</span>
                                    )}
                                </>
                            )}

                            {/* Page numbers */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(number => {
                                    // Show current page and 1 page before and after
                                    return (
                                        number === 1 ||
                                        number === totalPages ||
                                        Math.abs(number - currentPage) <= 1
                                    );
                                })
                                .map((number) => (
                                    <button
                                        key={number}
                                        onClick={() => setCurrentPage(number)}
                                        className={`px-3 py-1 rounded-md ${currentPage === number
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {number}
                                    </button>
                                ))}

                            {/* Last page */}
                            {currentPage < totalPages - 2 && (
                                <>
                                    {currentPage < totalPages - 3 && (
                                        <span className="px-2 py-1 text-gray-500 dark:text-gray-400">...</span>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}

                            {/* Next button */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 rounded-md ${currentPage === totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageTest;
