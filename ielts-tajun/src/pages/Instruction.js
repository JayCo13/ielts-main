import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, PenTool, Mic, BookA, CheckCircle2, ChevronRight, Home, Sparkles, BookMarked, BrainCircuit, HeadphonesIcon, FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Instruction = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const fadeUpVariant = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const containerVariant = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            {/* Breadcrumb & Navigation */}
            <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <nav className="flex items-center space-x-2 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-indigo-600 flex items-center transition-colors duration-300">
                            <Home size={16} className="mr-1" />
                            Trang chủ
                        </Link>
                        <ChevronRight size={16} className="text-gray-400" />
                        <span className="text-gray-900 font-medium">Hướng dẫn sử dụng</span>
                    </nav>
                </div>
            </div>

            <main className="flex-grow pb-24">
                {/* Header Section */}
                <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white py-20 px-6">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                        <div className="absolute top-0 -right-40 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
                    </div>

                    <div className="relative max-w-4xl mx-auto text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-6xl font-bold mb-6"
                        >
                            Tổng quan tính năng nền tảng
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xl text-indigo-100 max-w-2xl mx-auto"
                        >
                            Khám phá những tính năng mạnh mẽ được thiết kế để hỗ trợ quá trình ôn luyện IELTS trên máy tính và giúp bạn cải thiện kết quả.
                        </motion.p>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-6 -mt-10">
                    <motion.div
                        variants={containerVariant}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        {/* Listening Section */}
                        <motion.div variants={fadeUpVariant} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-md">
                                        <HeadphonesIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Listening</h2>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                            Full Tests
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed ml-7">
                                            Đây là các bài thi đầy đủ mô phỏng sát với kỳ thi IELTS thực tế. Các bài test đi kèm với lời giải chi tiết và nhiều tính năng học tập giúp người dùng cải thiện kỹ năng nghe. Người học cũng có thể làm quen với giao diện thi trên máy tính và áp lực phòng thi thật. Những bài này rất phù hợp cho việc ôn luyện dài hạn và có thể thay thế tài liệu giấy truyền thống.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-2">
                                            <Sparkles className="w-5 h-5 text-blue-500" />
                                            Forecast
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed ml-7">
                                            Các bài test này được chọn lọc từ Full Tests và được cập nhật thường xuyên dựa trên xu hướng đề thi mới nhất. Nội dung tập trung vào các dạng câu hỏi có khả năng cao xuất hiện hoặc lặp lại trong kỳ thi sắp tới. Forecast đặc biệt phù hợp với những thí sinh dự định thi trong vòng 1 tháng.
                                        </p>
                                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 ml-7">
                                            <strong>Lưu ý:</strong> Đây chỉ là dự đoán dựa trên xác suất, không có đảm bảo 100% rằng các chủ đề này sẽ xuất hiện trong bài thi thật.
                                        </p>
                                    </div>

                                    <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                        <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Quyền truy cập</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-gray-900">Tài khoản thường (No-VIP):</span>
                                                    <p className="text-gray-600">Chỉ truy cập được 6 bài Listening</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-emerald-700">Tài khoản VIP:</span>
                                                    <p className="text-gray-600">Truy cập toàn bộ bài Listening trên website</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Reading Section */}
                        <motion.div variants={fadeUpVariant} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-md">
                                        <BookOpen className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Reading</h2>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            Full Tests
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed ml-7">
                                            Các bài test đầy đủ mô phỏng bài thi IELTS thực tế, đi kèm lời giải chi tiết và các tính năng hỗ trợ học tập. Chúng giúp người dùng cải thiện kỹ năng đọc, làm quen với giao diện thi trên máy tính và trải nghiệm điều kiện thi thật. Đây là lựa chọn lý tưởng cho việc ôn luyện dài hạn và có thể thay thế tài liệu giấy truyền thống.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2 mb-2">
                                            <Sparkles className="w-5 h-5 text-emerald-500" />
                                            Forecast
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed ml-7">
                                            Các bài test này được chọn từ Full Tests và cập nhật thường xuyên theo xu hướng đề thi mới nhất. Nội dung tập trung vào các câu hỏi có khả năng cao xuất hiện hoặc lặp lại trong kỳ thi sắp tới. Phù hợp cho thí sinh chuẩn bị thi trong vòng 1 tháng.
                                        </p>
                                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 ml-7">
                                            <strong>Lưu ý:</strong> Đây chỉ là dự đoán dựa trên xác suất, không có đảm bảo 100% rằng các chủ đề này sẽ xuất hiện trong bài thi thật.
                                        </p>
                                    </div>

                                    <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                        <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Quyền truy cập</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-gray-900">Tài khoản thường (No-VIP):</span>
                                                    <p className="text-gray-600">Chỉ truy cập được 6 bài Reading</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-emerald-700">Tài khoản VIP:</span>
                                                    <p className="text-gray-600">Truy cập toàn bộ bài Reading trên website</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Writing Section */}
                        <motion.div variants={fadeUpVariant} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-md">
                                        <PenTool className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">Writing</h2>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-5 h-5 text-amber-500" />
                                            Full Tests
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed ml-7">
                                            Các bài test mô phỏng bài thi Writing thực tế, kèm theo lời giải chi tiết và các tính năng học tập. Sau khi hoàn thành bài, người dùng có thể sử dụng tính năng chấm bài bằng AI để nhận phản hồi ngay lập tức và cải thiện bài viết theo tiêu chí chấm điểm chính thức.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2 mb-2">
                                            <Sparkles className="w-5 h-5 text-amber-500" />
                                            Forecast
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed ml-7">
                                            Các bài test này được chọn từ Full Tests và cập nhật thường xuyên theo xu hướng đề thi mới nhất. Phù hợp với thí sinh chuẩn bị thi trong vòng 1 tháng. Người dùng cũng có thể nhận chấm bài và phản hồi AI sau mỗi bài làm.
                                        </p>
                                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 ml-7">
                                            <strong>Lưu ý:</strong> Đây chỉ là dự đoán dựa trên xác suất, không có đảm bảo 100% rằng các chủ đề này sẽ xuất hiện trong bài thi thật.
                                        </p>
                                    </div>

                                    <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                        <h4 className="font-semibold text-gray-900 mb-3 border-b pb-2">Quyền truy cập</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-gray-900">Tài khoản thường (No-VIP):</span>
                                                    <p className="text-gray-600">Truy cập toàn bộ bài Writing (miễn phí)<br />• 1 lượt chấm Writing bằng AI mỗi ngày</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-emerald-700">Tài khoản VIP (gói Listening & Reading):</span>
                                                    <p className="text-gray-600">• Thêm 6 lượt chấm Writing bằng AI mỗi ngày</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Speaking & Vocabulary Combined Column */}
                        <div className="space-y-8 flex flex-col">
                            {/* Speaking Section */}
                            <motion.div variants={fadeUpVariant} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group flex-grow">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl shadow-md">
                                            <Mic className="w-8 h-8 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900">Speaking</h2>
                                    </div>

                                    <div className="space-y-5">
                                        <p className="text-gray-600 leading-relaxed">
                                            Người dùng có thể truy cập miễn phí các <strong className="text-purple-700">file PDF dự đoán Speaking</strong> theo từng giai đoạn:
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                                <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                                                <span className="text-gray-700 text-sm font-medium">Tháng 1 – 4</span>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                                <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                                                <span className="text-gray-700 text-sm font-medium">Tháng 5 – 8</span>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                                <FileText className="w-5 h-5 text-purple-500 shrink-0" />
                                                <span className="text-gray-700 text-sm font-medium">Tháng 9 – 12</span>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                                            <Calendar className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                                            <div className="text-sm text-gray-700">
                                                Chủ đề Speaking được cập nhật <strong>3 lần mỗi năm</strong>: vào các tháng <strong>1, 5 và 9</strong>.
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl">
                                            <strong className="text-emerald-700">Hoàn toàn miễn phí:</strong> Người dùng luôn có thể truy cập tài liệu Speaking bất cứ lúc nào.
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Vocabulary Section */}
                            <motion.div variants={fadeUpVariant} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-4 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl shadow-md">
                                            <BookMarked className="w-8 h-8 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900">Vocabulary</h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-50">
                                            <BookA className="w-6 h-6 text-indigo-500 mt-1 shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-gray-900 mb-1">Danh sách từ vựng cá nhân</h4>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    Sau khi hoàn thành bài test, người dùng có thể lưu lại từ vựng mới từ phần Listening và Reading vào danh sách từ vựng cá nhân. Điều này giúp người học ôn tập có hệ thống và mở rộng vốn từ trong quá trình luyện tập.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-50">
                                            <BrainCircuit className="w-6 h-6 text-purple-500 mt-1 shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-gray-900 mb-1">Tính năng Dictation</h4>
                                                <p className="text-gray-600 text-sm leading-relaxed">
                                                    Người dùng cũng có thể sử dụng tính năng dictation (nghe chép chính tả) để luyện chính tả và ghi nhớ từ vựng tốt hơn. Tính năng này giúp ghi nhớ lâu hơn và cải thiện độ chính xác khi viết.
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-indigo-800 font-medium text-center bg-indigo-50 py-3 px-4 rounded-xl">
                                            Một trong những tính năng học từ vựng hiệu quả nhất, giúp bạn phát triển vốn từ tự nhiên trong quá trình luyện đề.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Instruction;
