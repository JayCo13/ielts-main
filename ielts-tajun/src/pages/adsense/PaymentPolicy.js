import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react'; // Import icons
import { Player } from '@lottiefiles/react-lottie-player'; // Import Player from @lottiefiles/react-lottie-player

const PaymentPolicy = () => {
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
              <h1 className="text-4xl sm:text-3xl text-center font-bold text-gray-900 mb-2">Chính sách thanh toán</h1>
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
                <span className="font-bold">thiieltstrenmay.com</span> cung cấp các phương thức thanh toán thuận tiện và an toàn
                để đảm bảo trải nghiệm mua sắm tốt nhất cho khách hàng.
              </p>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-blue-600" />
                  1. Hình thức thanh toán áp dụng
                </h2>
                <p className="text-gray-700 mb-4">
                  Hiện tại, chúng tôi chỉ hỗ trợ thanh toán bằng hình thức chuyển khoản ngân hàng.
                  Khách hàng vui lòng thực hiện chuyển khoản theo thông tin sau:
                </p>

                {/* Bank Transfer Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Chuyển khoản ngân hàng</h3>
                  <div className="space-y-1 text-gray-700">
                    <p><span className="font-medium">Ngân hàng:</span> Ngân hàng Vietcombank</p>
                    <p><span className="font-medium">Số tài khoản:</span> 0281000531756</p>
                    <p><span className="font-medium">Chủ tài khoản:</span>Ho kinh doanh thiieltstrenmay</p>
                    <p><span className="font-medium">Nội dung chuyển khoản:</span> [Mã giao dịch tạo bởi web]</p>
                  </div>
                </div>

                {/* MoMo Section */}
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <h3 className="font-semibold text-pink-900 mb-2 flex items-center">
                    <Smartphone className="mr-2 h-4 w-4" />
                    MoMo
                  </h3>
                  <div className="space-y-1 text-gray-700">
                    <p><span className="font-medium">Số tài khoản:</span> 1063266050</p>
                    <p><span className="font-medium">Chủ tài khoản:</span> Ho kinh doanh thiieltstrenmay</p>
                    <p><span className="font-medium">Nội dung chuyển khoản:</span> [Mã giao dịch tạo bởi web]</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Quy trình thanh toán</h2>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                      1
                    </div>
                    <p className="text-gray-700">Khách hàng lựa chọn sản phẩm và đặt hàng trên website.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                      2
                    </div>
                    <p className="text-gray-700">Hệ thống gửi xác nhận đơn hàng kèm thông tin chuyển khoản.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                      3
                    </div>
                    <p className="text-gray-700">Khách hàng thực hiện chuyển khoản theo đúng thông tin trên.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                      4
                    </div>
                    <p className="text-gray-700">Sau khi nhận được thanh toán, chúng tôi sẽ xác nhận qua hệ thống/điện thoại và tiến hành cung cấp sản phẩm.</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Lưu ý quan trọng</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      Khách hàng vui lòng giữ lại biên lai/chứng từ chuyển khoản để đối chiếu khi cần.
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      Đơn hàng chỉ được coi là hoàn tất sau khi chúng tôi nhận được thanh toán đầy đủ.
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      Nếu sau 24 giờ kể từ khi đặt hàng mà chưa nhận được thanh toán, đơn hàng có thể bị hủy tự động.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Nếu bạn có bất kỳ câu hỏi nào về phương thức thanh toán, vui lòng liên hệ với chúng tôi qua:
                </p>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">Email:</span> thiieltstrenmay@gmail.com</p>
                  <p><span className="font-medium">Điện thoại:</span> 1063266050</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentPolicy;