import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Home, ChevronRight, UserPlus } from 'lucide-react';
import { format, isValid } from 'date-fns';
import ResetPassword from '../ResetPassword';
import { Link } from 'react-router-dom';

// Thêm các import ở trên cùng
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

const ManageStudents = () => {
    const [selectedTest, setSelectedTest] = useState(null);
    const [tests, setTests] = useState({ speaking: [], writing: [] });
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    // Thêm các biến state ở trên cùng với các state khác
    const [currentPage, setCurrentPage] = useState(1);
    const [studentsPerPage] = useState(5);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [selectedStudentForReset, setSelectedStudentForReset] = useState(null);

    // Thêm các biến state mới
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({ email: '', username: '', is_active: true });

    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        sortBy: 'username',
        role: 'all'
    });
    // Thêm xử lý phân trang
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };
    // Thêm xử lý lọc mới
    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };
    
    const handleEdit = async (student) => {
        // Lấy thông tin chi tiết của học viên
        try {
            const response = await fetch(`http://localhost:8000/students/${student.user_id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            const data = await response.json();
            console.log('Đã nhận dữ liệu học viên đầy đủ:', data); // Ghi log để gỡ lỗi
            setSelectedStudent(data);
        setEditFormData({
                email: data.email,
                username: data.username,
                is_active: data.is_active,
                is_active_student: data.is_active_student || false
        });
        setIsEditDialogOpen(true);
        } catch (error) {
            console.error('Lỗi khi lấy thông tin chi tiết học viên:', error);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);
    
    // Đã xóa hàm fetchTests vì không cần thiết khi không có isTrackingMode

    const fetchStudents = async () => {
        try {
            const response = await fetch('http://localhost:8000/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            const data = await response.json();
            console.log(data);
            setStudents(data);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách học viên:', error);
        }
    };
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:8000/students/${selectedStudent.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify(editFormData)
            });

            if (response.ok) {
                setIsEditDialogOpen(false);
                fetchStudents();
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật học viên:', error);
        }
    };

    // Add resetFilters function
    const resetFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            sortBy: 'username',
            role: 'all'
        });
        setCurrentPage(1); // Reset to first page when filters are cleared
    };

    const filteredStudents = students.filter(student => {
        // First filter out admin users
        if (student.role === "admin") {
            return false;
        }

        const searchMatch = student.username.toLowerCase().includes(filters.search.toLowerCase()) ||
            student.email.toLowerCase().includes(filters.search.toLowerCase());
        const statusMatch = filters.status === 'all' ? true : student.status === filters.status;
        
        const roleMatch = filters.role === 'all' ? true : 
            (filters.role === 'active' ? student.is_active : 
             filters.role === 'inactive' ? !student.is_active : 
             filters.role === 'active_student' ? student.is_active_student : 
             filters.role === 'inactive_student' ? !student.is_active_student : true);
            
        return searchMatch && statusMatch && roleMatch;
    }).sort((a, b) => {
        switch (filters.sortBy) {
            case 'username':
                return a.username.localeCompare(b.username);
            case 'email':
                return a.email.localeCompare(b.email);
            case 'created':
                return new Date(b.created_at) - new Date(a.created_at);
            default:
                return 0;
        }
    });
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isValid(date)) {
            return format(date, 'dd-MM-yyyy, HH:mm');
        }
        return 'N/A';
    };
    // Thêm tính toán phân trang
    const indexOfLastStudent = currentPage * studentsPerPage;
    const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

    const handleView = async (studentId) => {
        try {
            const response = await fetch(`http://localhost:8000/students/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            const data = await response.json();
            // Đảm bảo thiết lập đối tượng học viên đầy đủ
            setSelectedStudent({
                ...data,
                status: data.status,
                image_url: data.image_url,
                created_at: data.created_at
            });
            setIsViewDialogOpen(true);
        } catch (error) {
            console.error('Lỗi khi lấy thông tin chi tiết học viên:', error);
        }
    };


    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        {/* Điều hướng */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center space-x-2">
                        <Link to="/" className="text-gray-400 hover:text-violet-600 transition-colors">
                            <Home size={20} />
                        </Link>
                        <ChevronRight size={20} className="text-gray-400" />
                        <span className="text-violet-600 dark:text-violet-400">
                           Quản Lý Tài Khoản Học Viên
                        </span>
                    </div>
                </div>
            </div>
        </nav>

        {/* Tiêu đề */}
        <div className="m-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Quản Lý Tài Khoản Học Viên</h1>
        </div>
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bộ lọc tìm kiếm</h3>
                <button
                    onClick={resetFilters}
                    className="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-150 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Đặt lại bộ lọc
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Bộ lọc Tìm kiếm */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tìm kiếm
                    </label>
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Tìm theo tên đăng nhập hoặc email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                {/* Bộ lọc Trạng thái */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Trạng thái
                    </label>
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="online">Trực tuyến</option>
                        <option value="offline">Ngoại tuyến</option>
                    </select>
                </div>

                {/* Bộ lọc Quyền hạn - NEW */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tài khoản
                    </label>
                    <select
                        name="role"
                        value={filters.role}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">Tất cả</option>
                        <option value="active">Khách hàng hoạt động</option>
                        <option value="inactive">Khách hàng bị khóa</option>
                        <option value="active_student">Học viên hoạt động</option>
                        <option value="inactive_student">Học viên bị khóa</option>
                    </select>
                </div>

                {/* Bộ lọc Sắp xếp */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sắp xếp theo
                    </label>
                    <select
                        name="sortBy"
                        value={filters.sortBy}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="username">Tên đăng nhập</option>
                        <option value="email">Email</option>
                        <option value="created">Ngày tạo</option>
                    </select>
                </div>
            </div>
        </div>
        {/* Nội dung chính */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs font-semibold tracking-wide text-left text-gray-500 uppercase border-b dark:border-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800">
                            <th className="px-6 py-4">Ảnh đại diện</th>
                            <th className="px-6 py-4">Tên đăng nhập</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4">Quyền hạn</th>
                            <th className="px-6 py-4">Ngày tạo</th>
                            <th className="px-6 py-4">Tác vụ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {currentStudents.map((student) => (
                            <tr key={student.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <img
                                        src={student.image_url}
                                        alt={`Ảnh đại diện của ${student.username}`}
                                        className="h-10 w-10 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src = 'https://ui-avatars.com/api/?name=' + student.username;
                                        }}
                                    />
                                </td>

                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{student.username}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                    {student.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${student.status === 'online'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                        }`}>
                                        {student.status === 'online' ? 'Trực tuyến' : 'Ngoại tuyến'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${student.is_active
                                        ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                        }`}>
                                        {student.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                        {formatDate(student.created_at)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleView(student.user_id)}
                                            className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:hover:text-violet-400"
                                        >
                                            Xem
                                        </button>
                                        <button
                                            onClick={() => handleEdit(student)}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                                        >
                                            Cập Nhật
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedStudentForReset(student);
                                                setIsResetPasswordOpen(true);
                                            }}
                                            className="text-sm font-medium text-red-600 hover:text-red-700 dark:hover:text-red-400"
                                        >
                                            Đặt lại mật khẩu
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-b-xl">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                    Trước
                </button>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                    Tiếp
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        Hiển thị <span className="font-medium">{indexOfFirstStudent + 1}</span> đến{' '}
                        <span className="font-medium">
                            {Math.min(indexOfLastStudent, filteredStudents.length)}
                        </span>{' '}
                        của <span className="font-medium">{filteredStudents.length}</span> kết quả
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Phân trang">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                            <button
                                key={number}
                                onClick={() => handlePageChange(number)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${currentPage === number
                                        ? 'z-10 bg-violet-50 border-violet-500 text-violet-600 dark:bg-violet-900 dark:text-violet-200'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
                                    }
                        ${number === 1 && 'rounded-l-md'}
                        ${number === totalPages && 'rounded-r-md'}
                    `}
                            >
                                {number}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        </div>
            <Transition appear show={isViewDialogOpen} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setIsViewDialogOpen(false)}
                >
                    <Transition.Child
                        as={Fragment}
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
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                        Chi Tiết Học Viên
                                    </Dialog.Title>

                                    {selectedStudent && (
                                        <div className="space-y-4">
                                            <div className="flex justify-center mb-6">
                                                <img
                                                    src={selectedStudent.image_url || `https://ui-avatars.com/api/?name=${selectedStudent.username}`}
                                                    alt={`Ảnh đại diện của ${selectedStudent.username}`}
                                                    className="h-24 w-24 rounded-full object-cover border-4 border-violet-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-400">
                                                    ID Người dùng
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                    {selectedStudent.user_id}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-400">
                                                    Tên đăng nhập
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                    {selectedStudent.username}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-400">
                                                    Email
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                    {selectedStudent.email}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-400">
                                                    Trạng thái
                                                </label>
                                                <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${selectedStudent.status === 'online'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                                    }`}>
                                                    {selectedStudent.status === 'online' ? 'Trực tuyến' : 'Ngoại tuyến'}
                                                </span>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-400">
                                                    Trạng thái tài khoản
                                                </label>
                                                <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${selectedStudent.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                                    }`}>
                                                    {selectedStudent.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                                </span>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-400">
                                                    Ngày tạo
                                                </label>
                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                    {formatDate(selectedStudent.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setIsViewDialogOpen(false)}
                                        className="mt-6 w-full bg-violet-500 text-white py-2 px-4 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-colors duration-300"
                                    >
                                        Đóng
                                    </button>
                                </Dialog.Panel>

                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            {/* Edit Dialog */}
            <Transition appear show={isEditDialogOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsEditDialogOpen(false)}>
                    <Transition.Child
                        as={Fragment}
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
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center justify-between">
                                        <span>Chỉnh Sửa Tài Khoản Học Viên</span>
                                        <button
                                            onClick={() => setIsEditDialogOpen(false)}
                                            className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                        >
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </Dialog.Title>

                                    <form onSubmit={handleEditSubmit} className="space-y-6">
                                        {/* Phần Trạng thái Tài khoản */}
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái Tài khoản</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className={`w-3 h-3 rounded-full ${editFormData.is_active ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái Quản trị</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {editFormData.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className={`w-3 h-3 rounded-full ${editFormData.is_active_student ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái Học viên</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {editFormData.is_active_student ? 'Hoạt động' : 'Không hoạt động'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phần Thông tin Tài khoản */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Thông tin Tài khoản</h3>
                                            <div className="space-y-4">
                                        <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Địa chỉ Email
                                            </label>
                                            <input
                                                type="email"
                                                value={editFormData.email}
                                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        placeholder="Nhập địa chỉ email"
                                            />
                                        </div>
                                        <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Tên đăng nhập
                                            </label>
                                            <input
                                                type="text"
                                                value={editFormData.username}
                                                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        placeholder="Nhập tên đăng nhập"
                                            />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phần Điều khiển Quản trị */}
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Điều khiển Quản trị</h3>
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    checked={editFormData.is_active}
                                                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                                                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    Bật/Tắt Quyền Truy cập Tài khoản
                                                </span>
                                        </div>
                                        </div>

                                        {/* Nút Hành động */}
                                        <div className="flex space-x-3 pt-4">
                                            <button
                                                type="submit"
                                                className="flex-1 bg-violet-600 text-white py-2.5 px-4 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-colors duration-300"
                                            >
                                                Lưu Thay đổi
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditDialogOpen(false)}
                                                className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                            >
                                                Hủy bỏ
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            <ResetPassword
    isOpen={isResetPasswordOpen}
    closeModal={() => setIsResetPasswordOpen(false)}
    studentId={selectedStudentForReset?.user_id}
    studentUsername={selectedStudentForReset?.username}
/>
        </div>
    );
};

export default ManageStudents;
