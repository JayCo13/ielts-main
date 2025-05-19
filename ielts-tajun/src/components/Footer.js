import React from 'react';
import { motion } from 'framer-motion';

const Footer = () => {
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <footer className="py-12 px-6 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden border-t-2">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-64 h-64 bg-green-100 rounded-full opacity-30 -translate-x-1/2 -translate-y-1/2 blur-xl"></div>
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-100 rounded-full opacity-30 translate-x-1/2 translate-y-1/2 blur-xl"></div>
                <svg className="absolute bottom-0 right-0 w-full h-32 text-gray-50 opacity-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
                    <path fill="currentColor" fillOpacity="1" d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,186.7C672,192,768,192,864,176C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
                    </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Logo and about section */}
                    <div className="md:col-span-4 flex flex-col items-start">
                            <img
                                src="/img/logo-ielts.png"
                                alt="IELTS Prep Logo"
                            className="h-20 w-20 mb-4"
                        />
                        <p className="text-gray-600 mb-4">Nền tảng luyện thi IELTS trên máy chuyên nghiệp với đề thi gốc và giao diện chuẩn quốc tế.</p>
                        
                        {/* Social Icons with hover effects */}
                        <div className="flex space-x-3 mt-2">
                            <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm hover:shadow-md transition-all duration-300 text-gray-600 hover:text-blue-600 border border-gray-100">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5L14.17.5C10.24.5,9.1,3.3,9.1,5.47V7.46H5.27v4.01h3.83V23.5h5.4V11.47h4.28l.58-4.01Z" />
                                </svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm hover:shadow-md transition-all duration-300 text-gray-600 hover:text-blue-400 border border-gray-100">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.954 4.569c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.555-2.005.959-3.127 1.184-.896-.959-2.173-1.559-3.591-1.559-2.717 0-4.92 2.203-4.92 4.917 0 .39.045.765.127 1.124C7.691 8.094 4.066 6.13 1.64 3.161c-.427.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.061c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.377 4.604 3.417-1.68 1.319-3.809 2.105-6.102 2.105-.39 0-.779-.023-1.17-.067 2.189 1.394 4.768 2.209 7.557 2.209 9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63.961-.689 1.8-1.56 2.46-2.548l-.047-.02z" />
                                </svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm hover:shadow-md transition-all duration-300 text-gray-600 hover:text-pink-500 border border-gray-100">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Footer nav columns with animations */}
                    <div className="md:col-span-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                            {/* Column 1 - Test Practice */}
                            <motion.div 
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                            >
                                <h3 className="text-gray-900 uppercase text-sm font-medium mb-4 relative inline-block">
                                    Thi Thử
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-green-400 to-green-600"></span>
                                </h3>
                                <ul className="space-y-3">
                                    <li><a href="/listening_list" className="text-gray-600 hover:text-green-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Listening
                                    </a></li>
                                    <li><a href="/reading_list" className="text-gray-600 hover:text-green-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Reading
                                    </a></li>
                                    <li><a href="/writing_list" className="text-gray-600 hover:text-green-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Writing
                                    </a></li>
                                    <li><a href="/speaking_list" className="text-gray-600 hover:text-green-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Speaking
                                    </a></li>
                                </ul>
                            </motion.div>

                            {/* Column 2 - VIP Plans */}
                            <motion.div 
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: 0.1 }}
                            >
                                <h3 className="text-gray-900 uppercase text-sm font-medium mb-4 relative inline-block">
                                    Đăng kí gói VIP
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></span>
                                </h3>
                                <ul className="space-y-3">
                                    <li><a href="/vip-packages" className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP 1 Kĩ năng Listening
                                    </a></li>
                                    <li><a href="/vip-packages" className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP 1 Kĩ năng Reading
                                    </a></li>
                                    <li><a href="/vip-packages" className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP 4 Kĩ năng
                                    </a></li>
                                    <li><a href="/vip-packages" className="text-gray-600 hover:text-blue-600 transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Các gói VIP khác
                                    </a></li>
                                </ul>
                            </motion.div>

                            {/* Column 3 - Contact Info */}
                            <motion.div 
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: 0.2 }}
                            >
                                <h3 className="text-gray-900 uppercase text-sm font-medium mb-4 relative inline-block">
                                    Liên Hệ
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600"></span>
                                </h3>
                                <ul className="space-y-3">
                                    <li><a href="mailto:demo@gmail.com" className="text-gray-600 hover:text-purple-600 transition-colors duration-300 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                                        </svg>
                                        letietan3.ielts@gmail.com
                                    </a></li>
                                    <li><a href="tel:0364599686" className="text-gray-600 hover:text-purple-600 transition-colors duration-300 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                                        </svg>
                                        0364599686
                                    </a></li>
                                    <li><a href="#" className="text-gray-600 hover:text-purple-600 transition-colors duration-300 flex items-start gap-2">
                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                                        </svg>
                                        <span>Số 105 đường 5A, Khu Phố 3, Thủ Dầu Một, Bình Dương 75100, Việt Nam</span>
                                    </a></li>
                                </ul>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Divider with gradient */}
                <div className="h-px my-8 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

                {/* Bottom Copyright and legal links */}
                <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                    <div className="order-2 md:order-1 text-center md:text-left mb-4 md:mb-0">
                        <p>© 2017-{new Date().getFullYear()} IELTS TAJUN. All rights reserved</p>
                    </div>
                    <div className="order-1 md:order-2 flex gap-6 mb-4 md:mb-0">
                        <a href="#" className="hover:text-green-600 transition-colors">Điều khoản sử dụng</a>
                        <a href="#" className="hover:text-green-600 transition-colors">Chính sách bảo mật</a>
                        <a href="#" className="hover:text-green-600 transition-colors">Cookie</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;