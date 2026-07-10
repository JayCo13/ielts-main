import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const AboutUs = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          {/* Header Section */}
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-16">Về chúng tôi.</h1>

          {/* About Section with Sidebar */}
          <div className="flex flex-col md:flex-row gap-8 mb-24">
            {/* Sidebar Navigation - Static now */}
            <div className="w-full md:w-1/4">
              <ul className="space-y-4 sticky top-24">
                <li className="font-semibold text-black">Chúng tôi.</li>
                <li className="text-gray-500">Đội ngũ</li>
              </ul>
            </div>

            {/* Main Content */}
            <div className="w-full md:w-3/4">
              <div className="space-y-8">
                <p className="text-gray-700">
                  <span className="font-bold text-[#e67e22]">thiieltstrenmay.com</span> được thành lập với sứ mệnh cung cấp nền tảng luyện thi IELTS trên máy chuyên nghiệp
                  với đề thi gốc và giao diện chuẩn quốc tế. Chúng tôi cam kết mang đến trải nghiệm học tập hiệu quả,
                  giúp người học tiếp cận với các bài thi IELTS một cách thuận tiện và đạt kết quả cao nhất.
                </p>

                <p className="text-gray-700">
                  Với phương châm "niềm tin đúng chỗ - bứt phá tương lai", chúng tôi không ngừng cải tiến và phát triển
                  hệ thống, tích hợp công nghệ AI tiên tiến vào quá trình học tập. Đội ngũ chuyên gia IELTS 8.0+ của chúng tôi
                  luôn đồng hành cùng người học, cung cấp những tài liệu chất lượng và phương pháp học tập hiệu quả,
                  giúp học viên tự tin chinh phục mọi kỳ thi IELTS.
                </p>
              </div>
            </div>
          </div>

          {/* Full Width Image Section */}
          <div className="w-full mb-24">
            <img
              src="/img/ab-bg.png"
              alt="Our team working together"
              className="w-full h-auto object-cover"
              style={{ maxHeight: '270px' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/1200x250?text=Team+Collaboration';
              }}
            />
          </div>

          {/* Quote Section */}
          <div className="flex flex-col md:flex-row gap-8 mb-24 justify-center items-center mx-auto max-w-5xl">
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <blockquote className="italic text-2xl md:text-3xl text-gray-700 mb-4">
                "Master the computer-based IELTS, where every practice sharpens your skill and brings your dream score within reach."
              </blockquote>
              <p className="text-gray-500">- thiieltstrenmay.com team</p>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <img
                src="/img/hp1.webp"
                alt="Creative work"
                className="w-[450px] h-[300px] rounded-md shadow-md"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600x400?text=Creative+Work';
                }}
              />
            </div>
          </div>

          {/* Team Section */}
          <div className="mb-24">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Đội ngũ của chúng tôi</h2>
            <p className="text-gray-700 mb-6">
              thiieltstrenmay.com quy tụ đội ngũ chuyên gia giàu kinh nghiệm trong lĩnh vực giảng dạy IELTS và
              phát triển công nghệ. Chúng tôi không ngừng nghiên cứu và cập nhật để mang đến những
              giải pháp học tập hiệu quả nhất cho người học.
            </p>

            <ul className="list-disc list-inside space-y-3 text-gray-700">
              <li>Đội ngũ giảng viên có chứng chỉ IELTS 8.0+ và kinh nghiệm giảng dạy nhiều năm</li>
              <li>Các chuyên gia AI và công nghệ giáo dục hàng đầu</li>
              <li>Nhóm phát triển nội dung chuyên sâu về IELTS</li>
              <li>Đội ngũ hỗ trợ kỹ thuật và chăm sóc khách hàng 24/7</li>
            </ul>
          </div>

        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutUs;
