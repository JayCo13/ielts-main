import React, { useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Edit } from 'lucide-react';

const EditAccessDialog = ({ 
    isOpen, 
    onClose, 
    onUpdate, 
    selectedAccessTypes, 
    setSelectedAccessTypes,
    examId 
}) => {
    useEffect(() => {
        if (isOpen && examId) {
            fetchExamAccessTypes();
        }
    }, [isOpen, examId]);

    const fetchExamAccessTypes = async () => {
        try {
            const response = await fetch(`http://localhost:8000/admin/ielts-exams/${examId}/access`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSelectedAccessTypes(data.access_types || []);
            }
        } catch (error) {
            console.error('Error fetching access types:', error);
        }
    };

    return (
        <Transition appear show={isOpen} as={React.Fragment}>
            <Dialog
                as="div"
                className="relative z-50"
                onClose={onClose}
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
                                    <Edit className="h-5 w-5 text-violet-500 mr-2" />
                                    Edit Access Types
                                </Dialog.Title>
                                <div className="mt-4">
                                    <div className="space-y-2">
                                        {['no vip', 'vip', 'student'].map((type) => (
                                            <label key={type} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAccessTypes.includes(type)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedAccessTypes([...selectedAccessTypes, type]);
                                                        } else {
                                                            setSelectedAccessTypes(
                                                                selectedAccessTypes.filter(t => t !== type)
                                                            );
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                                    {type}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 flex space-x-4">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                                        onClick={onUpdate}
                                    >
                                        Update Access
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
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
    );
};

export default EditAccessDialog;