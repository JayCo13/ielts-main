import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Truck, Clock, Globe, FileText, AlertTriangle } from 'lucide-react';

const DeliPolicy = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-lg shadow-sm overflow-hidden w-full"
        >
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">                      
            {/* Header */}
            <div className="px-4 sm:px-6 pb-4">
              <h1 className="text-4xl sm:text-3xl text-center font-bold text-gray-900 mb-2">Chính sách vận chuyển và giao nhận</h1>
              <p className="text-gray-500 text-sm">
                Áp dụng cho website thương mại điện tử bán hàng: thiieltstrenmay.com
              </p>
              <p className="text-gray-500 text-sm">
                Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
            
            {/* Full width content */}
            <div className="w-full px-4 sm:px-6 pb-6">
              <p className="text-gray-700 mb-6">
                Chính sách vận chuyển và giao nhận này quy định các điều khoản về việc giao hàng và cung cấp dịch vụ 
                trên website <span className="font-bold">thiieltstrenmay.com</span>.
              </p>
              
              {/* Section 1: Phương thức giao hàng/cung ứng dịch vụ */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Truck className="mr-2 h-5 w-5 text-blue-600" />
                  1. Phương thức giao hàng/cung ứng dịch vụ
                </h2>
                
                {/* Digital Products */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">📱</span>
                    Sản phẩm số (đề IELTS, tài liệu PDF, audio, video)
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Sau khi thanh toán thành công, khách hàng sẽ nhận sản phẩm thông qua:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-700">Link tải trực tiếp trên website.</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-700">Email chứa file hoặc thông tin truy cập (gửi đến địa chỉ email đã đăng ký).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Thời gian giao nhận */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-green-600" />
                  2. Thời gian giao nhận
                </h2>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">⚡</span>
                    <span className="font-semibold text-gray-900">Sản phẩm số</span>
                  </div>
                  <p className="text-gray-700">
                    Khách hàng nhận ngay sau khi thanh toán thành công 
                    <span className="font-semibold text-green-700"> (tối đa 5 phút)</span>
                  </p>
                </div>
              </div>

              {/* Section 3: Phạm vi giao nhận */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-purple-600" />
                  3. Phạm vi giao nhận
                </h2>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">🌍</span>
                    Sản phẩm số
                  </h3>
                  <p className="text-gray-700">
                    Cung cấp <span className="font-semibold text-purple-700">toàn quốc</span> 
                    (chỉ cần có email hợp lệ)
                  </p>
                </div>
              </div>

              {/* Section 4: Trách nhiệm và chứng từ */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-indigo-600" />
                  4. Trách nhiệm và chứng từ
                </h2>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Sản phẩm số:</h3>
                  <p className="text-gray-700">
                    Hệ thống sẽ tự động ghi nhận lịch sử giao dịch, 
                    <span className="font-semibold"> email thông báo được xem như chứng từ giao nhận.</span>
                  </p>
                </div>
              </div>

              {/* Section 5: Xử lý chậm trễ hoặc sự cố */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-orange-600" />
                  5. Xử lý chậm trễ hoặc sự cố
                </h2>
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-700">
                        Nếu phát sinh chậm trễ trong việc giao hàng/cung cấp dịch vụ, chúng tôi sẽ 
                        <span className="font-semibold"> thông báo kịp thời</span> đến khách hàng.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-gray-700">
                        Khách hàng có quyền <span className="font-semibold text-orange-700">hủy giao dịch và được hoàn tiền </span> 
                        nếu việc giao nhận không đáp ứng thời gian cam kết.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Process Timeline */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quy trình giao nhận sản phẩm số</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  <div className="space-y-6">
                    <div className="relative flex items-start">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold relative z-10">1</div>
                      <div className="ml-4">
                        <h4 className="font-semibold text-gray-900">Thanh toán thành công</h4>
                        <p className="text-gray-600 text-sm">Hệ thống xác nhận giao dịch</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold relative z-10">2</div>
                      <div className="ml-4">
                        <h4 className="font-semibold text-gray-900">Tự động gửi email</h4>
                        <p className="text-gray-600 text-sm">Link tải và thông tin truy cập được gửi ngay</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold relative z-10">3</div>
                      <div className="ml-4">
                        <h4 className="font-semibold text-gray-900">Tải sản phẩm</h4>
                        <p className="text-gray-600 text-sm">Khách hàng có thể tải ngay hoặc truy cập tài khoản</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Hỗ trợ giao nhận</h3>
                <p className="text-gray-700 text-sm">
                  Nếu bạn gặp vấn đề về giao nhận hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi:
                </p>
                <p className="text-gray-700 text-sm mt-1">
                  Email: <span className="text-blue-600">thiieltstrenmay@gmail.com</span> | 
                  Điện thoại: <span className="text-blue-600">0964996195</span>
                </p>
                <p className="text-gray-600 text-xs mt-2">
                  Thời gian hỗ trợ: 8:00 - 22:00 (Thứ 2 - Chủ nhật)
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default DeliPolicy;