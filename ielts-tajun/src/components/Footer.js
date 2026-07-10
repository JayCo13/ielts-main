import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
                        <div className='flex items-center gap-6'>
                        <img
                            src="/img/logo-ielts.png"
                            alt="IELTS Prep Logo"
                            className="h-28 w-28 mb-4"
                        />
                        <a href="http://online.gov.vn/Home/WebDetails/136413" target="_blank" rel="noopener noreferrer">
                        <img
                            src="/img/bocongthuong.png"
                            alt="IELTS Prep Logo"
                            className="h-16 w-25 mb-4"
                        />
                        </a>
                        </div>
                        <p className="text-gray-600 mb-4">Nền tảng luyện thi IELTS trên máy chuyên nghiệp với đề thi gốc và giao diện chuẩn quốc tế.</p>

                        {/* Social Icons with hover effects */}
                    </div>

                    {/* Footer nav columns with animations */}
                    <div className="md:col-span-8">
                       <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12">
                             {/* Column 1 - Test Practice */}
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                            >
                                <h3 className="text-gray-900 uppercase text-md font-medium mb-4 relative inline-block">
                                    Thi Thử
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-[#2b5356]/10 to-[#2b5356]"></span>
                                </h3>
                                <ul className="space-y-3">
                                    <li><a href="listening_list" className="text-gray-600 hover:text-[#2b5356] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Listening
                                    </a></li>
                                    <li><a href="#" className="text-gray-600 hover:text-[#2b5356] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Reading
                                    </a></li>
                                    <li><a href="writing_list" className="text-gray-600 hover:text-[#2b5356] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Writing
                                    </a></li>
                                    <li><a href="speaking_list" className="text-gray-600 hover:text-[#2b5356] transition-colors duration-300 flex items-center gap-1.5">
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
                                <h3 className="text-gray-900 uppercase text-md font-medium mb-4 relative inline-block">
                                    Đăng kí gói VIP
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-[#eb7e37]/10 to-[#eb7e37]"></span>
                                </h3>
                                <ul className="space-y-3">
                                    <li><Link to="/vip-packages?type=listening" className="text-gray-600 hover:text-[#eb7e37] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP Listening
                                    </Link></li>
                                    <li><Link to="/vip-packages?type=reading" className="text-gray-600 hover:text-[#eb7e37] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP Reading
                                    </Link></li>
                                    <li><Link to="/vip-packages?type=writing" className="text-gray-600 hover:text-[#eb7e37] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP Writing
                                    </Link></li>
                                    <li><Link to="/vip-packages?type=all" className="text-gray-600 hover:text-[#eb7e37] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        VIP 4 Skills
                                    </Link></li>
                                </ul>
                            </motion.div>
                            
                              {/* Column 3 - About Us */}
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: 0.2 }}
                            >
                                <h3 className="text-gray-900 uppercase text-md font-medium mb-4 relative inline-block">
                                    Về chúng tôi
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-[#0096b1]/10 to-[#0096b1]"></span>
                                </h3>
                                <ul className="space-y-3 xl:space-y-4 2xl:space-y-5 3xl:space-y-6 4xl:space-y-7">
                                    <li><Link to="/about" className="text-gray-600 text-md hover:text-[#0096b1] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Giới thiệu
                                    </Link></li>
                                    <li><Link to="/permission" className="text-gray-600 text-md hover:text-[#0096b1] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Điều kiện KD
                                    </Link></li>
                                     <li><Link to="/comp-policy" className="text-gray-600 text-md hover:text-[#0096b1] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Điều kiện giao dịch chung
                                    </Link></li>
                                </ul>
                            </motion.div>
                            
                            {/* Column 4 - Policies */}
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: 0.3 }}
                            >
                                <h3 className="text-gray-900 uppercase text-md font-medium mb-4 relative inline-block">
                                    Chính sách
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-[#8b5cf6]/10 to-[#8b5cf6]"></span>
                                </h3>
                                <ul className="space-y-3 xl:space-y-4 2xl:space-y-5 3xl:space-y-6 4xl:space-y-7">
                                    <li><Link to="/privacy-policy" className="text-gray-600 text-md hover:text-[#8b5cf6] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Chính sách bảo mật
                                    </Link></li>
                                    <li><Link to="/payment-policy" className="text-gray-600 text-md hover:text-[#8b5cf6] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Chính sách thanh toán
                                    </Link></li>
                                    <li><Link to="/deli-policy" className="text-gray-600 text-md hover:text-[#8b5cf6] transition-colors duration-300 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>
                                        Chính sách vận chuyển và giao nhận
                                    </Link></li>
                                </ul>
                            </motion.div>
                            
                            {/* Column 5 - Contact Info */}
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                transition={{ delay: 0.2 }}
                            >
                                <h3 className="text-gray-900 uppercase text-md font-medium mb-4 relative inline-block">
                                    Liên Hệ
                                    <span className="absolute -bottom-1 left-0 w-1/2 h-0.5 bg-gradient-to-r from-blue-100 to-blue-500"></span>
                                </h3>
                                <ul className="space-y-3">
                                    <li><a href="mailto:thiieltstrenmay@gmail.com" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 flex items-center gap-2">
                                        <div className="rounded-full text-gray-500 hover:text-blue-500 transition-colors duration-300">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                                            </svg>
                                        </div>
                                        thiieltstrenmay@gmail.com
                                    </a></li>
                                    <li><a href="tel:0964996195" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                                        </svg>
                                        0964996195
                                    </a></li>
                                    <li><a href="https://zalo.me/0964996195" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 flex items-start gap-2">
                                        <img
                                            src="/img/zalo.png"
                                            alt="Zalo"
                                            className="w-4 h-4 mt-0.5 flex-shrink-0 transition-all duration-300"
                                            style={{
                                                filter: 'grayscale(1)',
                                                ':hover': {
                                                    filter: 'grayscale(0)',
                                                    transform: 'scale(1.1)'
                                                }
                                            }}
                                        />
                                        <span>0964996195</span>
                                    </a></li>
                                    <li><a href="https://www.facebook.com/ieltstajun/" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 flex items-start gap-2">
                                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                        </svg>
                                        <span>Thi IELTS trên máy tính</span>
                                    </a></li>
                                </ul>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Divider with gradient */}
                <div className="h-px my-8 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

                {/* Bottom Copyright and legal links */}
                <div className="justify-center items-center text-gray-500 text-md">
                    <div className="order-2 md:order-1 text-center mb-4 md:mb-0">
                        <p>Copyright © 2025 thiieltstrenmay.com. All rights reserved</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
