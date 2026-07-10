import React, { useState, useEffect, useRef } from 'react';
import ImagePreviewModal from './ImagePreviewModal';
import { X } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { API_BASE } from '../config/api';

const Achievements = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedCertificate, setSelectedCertificate] = useState(null);
    const [images, setImages] = useState([]);
    const [centerText, setCenterText] = useState('thiieltstrenmay.com');
    const [sloganText] = useState('niềm tin đúng chỗ - bứt phá tương lai');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const carouselRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await fetch(`${API_BASE}/student/action/feedbacks`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                const formattedData = data.map(feedback => ({
                    id: feedback.feedback_id,
                    image: `${API_BASE}${feedback.image_url}`,
                    alt: 'Student achievement',
                    content: feedback.content,
                    created_at: feedback.created_at
                }));
                setImages(formattedData);
            } catch (error) {
                console.error('Error fetching feedbacks:', error);
            }
        };

        fetchFeedbacks();
    }, []);

    const handleTextChange = (e) => {
        setCenterText(e.target.value);
    };

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    // Auto-advance carousel on mobile
    useEffect(() => {
        const interval = setInterval(() => {
            if (window.innerWidth < 768) {
                nextSlide();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [currentSlide]);

    // Handle touch events for swiping on mobile
    useEffect(() => {
        const carousel = carouselRef.current;
        if (!carousel) return;

        let startX;
        let isDragging = false;

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = startX - currentX;

            if (diff > 50) {
                nextSlide();
                isDragging = false;
            } else if (diff < -50) {
                prevSlide();
                isDragging = false;
            }
        };

        const handleTouchEnd = () => {
            isDragging = false;
        };

        carousel.addEventListener('touchstart', handleTouchStart);
        carousel.addEventListener('touchmove', handleTouchMove);
        carousel.addEventListener('touchend', handleTouchEnd);

        return () => {
            carousel.removeEventListener('touchstart', handleTouchStart);
            carousel.removeEventListener('touchmove', handleTouchMove);
            carousel.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);


    // Add these state variables after the other useState declarations (around line 20)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8); // 8 items per page (2 rows of 4 in desktop view)

    // Filter images based on search term and category
    const filteredImages = images.filter(image => {
        const matchesSearch = image.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all';
        return matchesSearch && matchesCategory;
    });

    // Calculate pagination values
    const totalItems = filteredImages.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Get current page items
    const currentItems = filteredImages.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div>
            <Navbar />
            <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen py-6">
                {/* Desktop Layout - Custom Image Grid with Text Area */}
                <div className="hidden md:block w-full max-w-[90%] mx-auto sm:px-6 lg:px-8 mb-2 mt-5">
                    <div className="relative w-full">
                        {/* Grid Container */}
                        <div className="grid-container relative w-full h-auto max-h-[80vh] min-h-[620px]">
                            {/* Top Row */}
                            <div className="absolute left-[2%] top-[2%] w-[28%] h-[25%]">
                                <ImageItem image={images[0]} onClick={() => setSelectedImage(images[0]?.image)} />
                            </div>
                            <div className="absolute left-[32%] top-[2%] w-[14%] h-[12%]">
                                <ImageItem image={images[1]} onClick={() => setSelectedImage(images[1]?.image)} />
                            </div>
                            <div className="absolute left-[32%] top-[16%] w-[14%] h-[12%]">
                                <ImageItem image={images[2]} onClick={() => setSelectedImage(images[2]?.image)} />
                            </div>
                            <div className="absolute left-[48%] top-[2%] w-[22%] h-[26%]">
                                <ImageItem image={images[3]} onClick={() => setSelectedImage(images[3]?.image)} />
                            </div>
                            <div className="absolute left-[72%] top-[2%] w-[12%] h-[22%]">
                                <ImageItem image={images[4]} onClick={() => setSelectedImage(images[4]?.image)} />
                            </div>
                            <div className="absolute left-[86%] top-[2%] w-[12%] h-[12%]">
                                <ImageItem image={images[5]} onClick={() => setSelectedImage(images[5]?.image)} />
                            </div>

                            {/* Middle Row - Left Side */}
                            <div className="absolute left-[2%] top-[33%] w-[18%] h-[18%]">
                                <ImageItem image={images[6]} onClick={() => setSelectedImage(images[6]?.image)} />
                            </div>

                            {/* Middle Row - Right Side */}
                            <div className="absolute left-[80%] top-[33%] w-[18%] h-[18%]">
                                <ImageItem image={images[7]} onClick={() => setSelectedImage(images[7]?.image)} />
                            </div>

                            {/* Bottom Row */}
                            <div className="absolute left-[2%] top-[58%] w-[18%] h-[24%]">
                                <ImageItem image={images[8]} onClick={() => setSelectedImage(images[8]?.image)} />
                            </div>
                            <div className="absolute left-[22%] top-[58%] w-[18%] h-[28%]">
                                <ImageItem image={images[9]} onClick={() => setSelectedImage(images[9]?.image)} />
                            </div>
                            <div className="absolute left-[42%] top-[58%] w-[24%] h-[34%]">
                                <ImageItem image={images[10]} onClick={() => setSelectedImage(images[10]?.image)} />
                            </div>
                            <div className="absolute left-[68%] top-[58%] w-[12%] h-[12%]">
                                <ImageItem image={images[11]} onClick={() => setSelectedImage(images[11]?.image)} />
                            </div>
                            <div className="absolute left-[68%] top-[72%] w-[12%] h-[14%]">
                                <ImageItem image={images[12]} onClick={() => setSelectedImage(images[12]?.image)} />
                            </div>
                            <div className="absolute left-[82%] top-[58%] w-[16%] h-[28%]">
                                <ImageItem image={images[13]} onClick={() => setSelectedImage(images[13]?.image)} />
                            </div>

                            {/* Center Text Area */}
                            <div className="absolute left-[28%] top-[35%] w-[44%] h-[15%] flex flex-col items-center justify-center">
                                <input
                                    type="text"
                                    value={centerText}
                                    onChange={handleTextChange}
                                    className="w-full text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-transparent focus:outline-none"
                                    style={{
                                        letterSpacing: '0.2em',
                                        maxWidth: '100%',
                                        padding: '0 10px'
                                    }}
                                    maxLength={20}
                                />
                                <i className="text-gray-500 text-xs sm:text-sm md:text-md lg:text-lg mt-2 text-center px-2 break-words w-full">
                                    {sloganText}
                                </i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout - Carousel */}
                <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-2">
                    <div className="relative w-full mb-8">
                        {/* Center Text Area for Mobile */}
                        <div className="w-full py-4 mb-4 flex flex-col items-center justify-center ">
                            <input
                                type="text"
                                value={centerText}
                                onChange={handleTextChange}
                                className="w-full text-center text-xl font-bold bg-transparent focus:outline-none"
                                style={{
                                    letterSpacing: '0.25em',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                                maxLength={20}
                            />
                            <i className="text-gray-500 text-xs sm:text-sm md:text-md lg:text-lg mt-2 text-center px-2 break-words w-full">
                                {sloganText}
                            </i>
                        </div>

                        {/* Carousel Container */}
                        <div
                            ref={carouselRef}
                            className="carousel-container relative w-full aspect-[4/3] overflow-hidden rounded-lg shadow-xl"
                        >
                            {/* Carousel Slides */}
                            <div
                                className="carousel-slides flex transition-transform duration-300 ease-in-out h-full"
                                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                            >
                                {images.map((image, index) => (
                                    <div
                                        key={index}
                                        className="carousel-slide min-w-full h-full flex-shrink-0"
                                        onClick={() => setSelectedImage(image?.image)}
                                    >
                                        <img
                                            src={image?.image}
                                            alt={image?.alt}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Carousel Controls */}
                            <button
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white/90 rounded-full p-2 shadow-md z-10"
                                onClick={prevSlide}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white/90 rounded-full p-2 shadow-md z-10"
                                onClick={nextSlide}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {/* Carousel Indicators */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                                {images.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`w-2 h-2 rounded-full ${currentSlide === index ? 'bg-white' : 'bg-white/50'}`}
                                        onClick={() => setCurrentSlide(index)}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="inline-flex items-center justify-center w-full">
                    <hr class="w-[90%] h-1 my-8 bg-gray-200 border-0 dark:bg-gray-400 rounded-full" />
                    <span class="absolute px-3 font-bold text-gray-900 -translate-x-1/2 bg-white left-1/2 dark:text-gray-400">thiieltstrenmay.com</span>
                </div>
                {/* Certificate Gallery Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 overflow-hidden rounded-2xl">
                   
                    {/* Background elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2b5356]/5 to-transparent z-0"></div>
                    <div className="absolute -right-20 top-0 w-64 h-64 bg-[#eb7e37]/10 rounded-full filter blur-3xl"></div>
                    <div className="absolute -left-20 bottom-0 w-64 h-64 bg-[#2b5356]/10 rounded-full filter blur-3xl"></div>

                        <div className="max-w-5xl mx-auto px-6 relative z-10 mb-10">
                            {/* Main content container with card-like appearance */}
                         
                                {/* Decorative elements */}
                                <div className="absolute top-4 left-4 w-20 h-1 bg-gradient-to-r from-[#2b5356] to-[#2b5356]/30 rounded-full"></div>
                                <div className="absolute top-4 right-4 w-20 h-1 bg-gradient-to-r from-[#eb7e37]/30 to-[#eb7e37] rounded-full"></div>

                                {/* Main heading with modern typography */}
                                <div className="text-center mb-8">
                                    <h2 className="inline-block text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#2b5356] to-[#2b5356]/80 mb-2">
                                        Danh sách <span className="font-serif italic bg-clip-text text-transparent bg-gradient-to-r from-[#eb7e37] to-[#f59e0b]">"trúng tủ"</span>
                                    </h2>
                                    <h3 className="text-2xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#2b5356]/80 to-[#2b5356] mb-6">
                                        của các tài khoản VIP
                                    </h3>
                                    <div className="w-24 h-1 bg-gradient-to-r from-[#2b5356] via-[#eb7e37] to-[#2b5356] mx-auto rounded-full"></div>
                                </div>

                                {/* Call to action with modern button */}
                                <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
                                    <p className="text-[#2b5356] text-lg font-medium">
                                        Bạn có muốn nằm trong danh sách <span className="font-serif italic text-[#eb7e37] font-bold">"trúng tủ"?</span>
                                    </p>
                                    <a
                                        href="/vip-packages?type=all"
                                        className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-0.5"
                                    >
                                        <span className="absolute h-full w-full bg-gradient-to-br from-[#2b5356] via-[#eb7e37] to-[#f59e0b] group-hover:from-[#eb7e37] group-hover:via-[#f59e0b] group-hover:to-[#2b5356] transition-all duration-500"></span>
                                        <span className="relative flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#2b5356] transition-all duration-200 group-hover:bg-opacity-0 group-hover:text-white">
                                            Đăng ký ngay
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>
                                    </a>
                                </div>
                            </div>
                    {/* Masonry Grid with Quotes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {currentItems.length > 0 ? (
                            currentItems.map((certificate) => (
                                <div
                                    key={certificate.id}
                                    className="group relative bg-gradient-to-b from-white to-gray-50 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                                    onClick={() => setSelectedCertificate(certificate)}
                                >
                                    <div className="aspect-w-3 aspect-h-4 bg-gray-100 relative overflow-hidden">
                                        <img
                                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                                            src={certificate.image}
                                            alt="IELTS Certificate"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="p-4 bg-white border-t border-gray-100">
                                        <blockquote className="text-gray-800 relative pl-4 border-l-2 border-[#eb7e37]">
                                            <p className="text-sm font-medium italic line-clamp-2">{certificate.content}</p>
                                        </blockquote>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                <p>Chưa có dữ liệu...</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center mt-8 space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                aria-label="Previous page"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>

                            {/* Page Numbers */}
                            {[...Array(totalPages).keys()].map(number => {
                                const pageNumber = number + 1;
                                // Show current page, first, last, and pages around current
                                const shouldShow = pageNumber === 1 ||
                                    pageNumber === totalPages ||
                                    Math.abs(pageNumber - currentPage) <= 1;

                                if (!shouldShow && pageNumber === 2 || !shouldShow && pageNumber === totalPages - 1) {
                                    return <span key={pageNumber} className="px-2">...</span>;
                                }

                                if (!shouldShow) return null;


                                return (
                                    <button
                                        key={pageNumber}
                                        onClick={() => setCurrentPage(pageNumber)}
                                        className={`w-10 h-10 rounded-md ${currentPage === pageNumber ? 'bg-[#eb7e37] text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                        aria-label={`Page ${pageNumber}`}
                                        aria-current={currentPage === pageNumber ? 'page' : undefined}
                                    >
                                        {pageNumber}
                                    </button>
                                );


                            })}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                aria-label="Next page"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Image Preview Modal */}
                <ImagePreviewModal
                    isOpen={!!selectedImage}
                    onClose={() => setSelectedImage(null)}
                    imageUrl={selectedImage}
                    altText="Student achievement"
                />

                {/* Certificate Detail Modal with Quote */}
                {selectedCertificate && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
                            <button
                                onClick={() => setSelectedCertificate(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-50"
                                aria-label="Close modal"
                            >
                                <X size={24} strokeWidth={2} />
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center justify-center opacity-25 z-10">
                                    <div className="bg-gray-200 text-gray-500 text-md md:text-2xl font-bold px-2 py-1 rounded-md">
                                        thiieltstrenmay.com
                                    </div>
                                </div>
                                <div className="max-h-[70vh] flex items-center justify-center p-4">
                                    <img
                                        src={selectedCertificate.image}
                                        alt="IELTS Certificate"
                                        className="max-w-full max-h-[70vh] h-auto w-auto rounded-md shadow-md object-contain"
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-30 p-4">
                                    <blockquote className="text-white">
                                        <p className="text-lg italic font-medium text-center">{selectedCertificate.content}</p>
                                    </blockquote>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <Footer />
            </div>
        </div>
    );
};

// Helper component for individual image items
const ImageItem = ({ image, onClick }) => {
    if (!image) return null;

    return (
        <div
            className="relative w-full h-full overflow-hidden rounded-lg shadow-lg cursor-pointer transform transition-transform duration-300 hover:scale-105"
            onClick={onClick}
        >
            <img
                src={image.image}
                alt={image.alt}
                className="w-full h-full object-cover"
            />
        </div>
    );
};

export default Achievements;
