import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { ArrowLeft } from 'lucide-react'; // Import arrow icon for back button
import { Player } from '@lottiefiles/react-lottie-player'; // Import Player from @lottiefiles/react-lottie-player

const PrivacyPolicy = () => {
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
              <h1 className="text-4xl sm:text-3xl text-center font-bold text-gray-900 mb-2">Chính sách bảo mật</h1>
              <p className="text-gray-500 text-sm">
                Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
            
            <div className="flex flex-col lg:flex-row w-full">
              {/* Left content column */}
              <div className="w-full lg:w-7/12 px-4 sm:px-6 pb-6">
                <p className="text-gray-700 mb-6">
                  <span className="font-bold">thiieltstrenmay.com</span> cam kết bảo vệ quyền riêng tư và thông tin cá nhân của người dùng. 
                  Chính sách này áp dụng cho website thương mại điện tử bán hàng và giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
                </p>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Mục đích thu thập thông tin cá nhân</h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Xử lý đơn hàng, cung cấp sản phẩm/dịch vụ cho khách hàng</li>
                    <li>• Liên hệ, hỗ trợ khách hàng trong quá trình sử dụng dịch vụ</li>
                    <li>• Cập nhật thông tin về sản phẩm, khuyến mãi (nếu khách hàng đồng ý)</li>
                  </ul>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Phạm vi sử dụng thông tin</h2>
                  <p className="text-gray-700 mb-2">Thông tin cá nhân của khách hàng chỉ được sử dụng trong các hoạt động sau:</p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Quản lý tài khoản, đơn hàng</li>
                    <li>• Giao nhận sản phẩm số qua email hoặc tài khoản học trực tuyến</li>
                    <li>• Liên hệ xác minh thông tin giao dịch, xử lý khiếu nại</li>
                  </ul>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Thời gian lưu trữ thông tin</h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Thông tin cá nhân được lưu trữ trong hệ thống của chúng tôi cho đến khi khách hàng yêu cầu hủy bỏ</li>
                    <li>• Trường hợp khách hàng không yêu cầu, thông tin sẽ được lưu trữ tối đa 05 năm kể từ lần giao dịch cuối cùng</li>
                  </ul>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Những người hoặc tổ chức có thể được tiếp cận với thông tin</h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Nhân viên quản lý đơn hàng và bộ phận chăm sóc khách hàng của thiieltstrenmay.com</li>
                    <li>• Cơ quan nhà nước có thẩm quyền khi có yêu cầu theo quy định pháp luật</li>
                    <li>• Tuyệt đối không bán, trao đổi, chia sẻ thông tin cá nhân của khách hàng cho bên thứ ba ngoài mục đích phục vụ giao dịch</li>
                  </ul>
                </div>
              </div>
              
              {/* Right illustration column - Replace with Player component */}
              <div className="w-full lg:w-5/12 p-4 sm:p-6 flex items-center justify-center">
                <Player 
                  autoplay 
                  loop 
                  src="/edu.json" 
                  className="w-full h-64 md:h-80"
                  background="transparent"
                  speed={1}
                />
              </div>
            </div>
            
            {/* Additional sections */}
            <div className="px-4 sm:px-6 pb-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Địa chỉ của đơn vị thu thập và quản lý thông tin</h2>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Chủ sở hữu website:</strong> thiieltstrenmay.com</li>
                  <li><strong>Email:</strong> <a href="mailto:thiieltstrenmay@gmail.com" className="text-blue-500 hover:underline">thiieltstrenmay@gmail.com</a></li>
                  <li><strong>Hotline:</strong> <a href="tel:0964996195" className="text-blue-500 hover:underline">0964996195</a></li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Quyền của khách hàng đối với dữ liệu cá nhân</h2>
                <ul className="space-y-2 text-gray-700">
                  <li>• Khách hàng có quyền kiểm tra, cập nhật, chỉnh sửa hoặc yêu cầu hủy bỏ thông tin cá nhân của mình bất kỳ lúc nào</li>
                  <li>• Khách hàng có thể gửi yêu cầu qua email: <a href="mailto:thiieltstrenmay@gmail.com" className="text-blue-500 hover:underline">thiieltstrenmay@gmail.com</a></li>
                  <li>• Hoặc hotline: <a href="tel:0964996195" className="text-blue-500 hover:underline">0964996195</a></li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cơ chế tiếp nhận và giải quyết khiếu nại</h2>
                <ul className="space-y-2 text-gray-700">
                  <li>• Nếu khách hàng phát hiện thông tin cá nhân bị sử dụng sai mục đích/phạm vi, vui lòng liên hệ ngay với chúng tôi</li>
                  <li>• Chúng tôi cam kết phản hồi và giải quyết trong vòng 07 ngày làm việc kể từ khi tiếp nhận khiếu nại</li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cam kết bảo mật</h2>
                <ul className="space-y-2 text-gray-700">
                  <li>• thiieltstrenmay.com cam kết bảo mật tuyệt đối thông tin cá nhân của khách hàng theo chính sách này</li>
                  <li>• Mọi giao dịch thanh toán được thực hiện qua ngân hàng đều tuân thủ tiêu chuẩn bảo mật của đối tác thanh toán và quy định pháp luật hiện hành</li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Quảng cáo và Google AdSense</h2>
                <p className="text-gray-700">
                  Chúng tôi sử dụng Google AdSense để hiển thị quảng cáo. Google AdSense sử dụng cookie 
                  để hiển thị quảng cáo phù hợp với người dùng. Bạn có thể tìm hiểu thêm về cách Google 
                  sử dụng dữ liệu tại: <a href="https://policies.google.com/technologies/ads" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">Google Ads Policy</a>
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

export default PrivacyPolicy;
