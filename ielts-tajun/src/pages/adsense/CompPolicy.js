import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FileText, ShoppingCart, RefreshCw, Shield, Users, DollarSign, Settings } from 'lucide-react';

const CompPolicy = () => {
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
              <h1 className="text-4xl sm:text-3xl text-center font-bold text-gray-900 mb-2">Điều kiện giao dịch chung</h1>
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
                Điều kiện giao dịch chung này quy định các điều khoản và điều kiện áp dụng cho việc mua bán sản phẩm/dịch vụ 
                trên website <span className="font-bold">thiieltstrenmay.com</span>.
              </p>
              
              {/* Section 1: Phạm vi cung cấp dịch vụ */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-600" />
                  1. Phạm vi cung cấp dịch vụ
                </h2>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700 mb-2">
                    <strong>Sản phẩm/dịch vụ được cung cấp:</strong> tài liệu ôn luyện IELTS, đề thi thử, khóa học trực tuyến 
                    (dạng file số: PDF, audio, video).
                  </p>
                  <p className="text-gray-700 mb-2">
                    Sản phẩm chỉ dành cho mục đích học tập, tham khảo, không phải đề thi chính thức của Hội đồng thi.
                  </p>
                  <p className="text-gray-700">
                    <strong>Phạm vi cung cấp:</strong> toàn quốc (qua hình thức online).
                  </p>
                </div>
              </div>

              {/* Section 2: Điều kiện hoặc hạn chế */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Settings className="mr-2 h-5 w-5 text-orange-600" />
                  2. Điều kiện hoặc hạn chế
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-gray-700">Chỉ cung cấp sản phẩm khi khách hàng hoàn tất thanh toán.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-gray-700">
                      Với sản phẩm số (file tải xuống), khách hàng cần có thiết bị phù hợp để mở 
                      (máy tính, điện thoại có PDF reader/audio player).
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-gray-700">Không áp dụng giao hàng quốc tế (chỉ trong lãnh thổ Việt Nam).</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Chính sách kiểm hàng, đổi trả và hoàn tiền */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <RefreshCw className="mr-2 h-5 w-5 text-green-600" />
                  3. Chính sách kiểm hàng, đổi trả và hoàn tiền
                </h2>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-gray-700 mb-3">
                    <strong>Sản phẩm số (file PDF, audio, video):</strong> không áp dụng đổi trả sau khi khách hàng đã tải về.
                  </p>
                  <p className="text-gray-700 mb-3">
                    Trường hợp file bị lỗi kỹ thuật hoặc không mở được, khách hàng được hỗ trợ gửi lại file hoặc hoàn tiền 
                    trong vòng <span className="font-semibold text-green-700">07 ngày</span> kể từ ngày mua.
                  </p>
                  <p className="text-gray-700">
                    <strong>Chính sách hoàn tiền:</strong> thực hiện qua cùng phương thức mà khách hàng đã thanh toán.
                  </p>
                </div>
              </div>

              {/* Section 4: Chính sách bảo hành sản phẩm */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-purple-600" />
                  4. Chính sách bảo hành sản phẩm
                </h2>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Vì là sản phẩm số, không áp dụng bảo hành vật lý.
                  </p>
                  <p className="text-gray-700">
                    <strong>Đối với khóa học trực tuyến:</strong> tài khoản học có hiệu lực theo thời hạn công bố trong mô tả sản phẩm.
                  </p>
                </div>
              </div>

              {/* Section 5: Quy trình cung cấp dịch vụ */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5 text-indigo-600" />
                  5. Quy trình cung cấp dịch vụ
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
                      <span className="font-semibold text-gray-900">Chọn sản phẩm</span>
                    </div>
                    <p className="text-gray-700 text-sm">Khách hàng chọn sản phẩm, thêm vào giỏ hàng.</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
                      <span className="font-semibold text-gray-900">Điền thông tin</span>
                    </div>
                    <p className="text-gray-700 text-sm">Điền thông tin liên hệ và chọn phương thức thanh toán.</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">3</span>
                      <span className="font-semibold text-gray-900">Xác nhận đơn hàng</span>
                    </div>
                    <p className="text-gray-700 text-sm">Kiểm tra và xác nhận đơn hàng.</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">4</span>
                      <span className="font-semibold text-gray-900">Nhận sản phẩm</span>
                    </div>
                    <p className="text-gray-700 text-sm">Thanh toán thành công → hệ thống gửi link tải hoặc email chứa thông tin truy cập.</p>
                  </div>
                </div>
              </div>

              {/* Section 6: Nghĩa vụ của các bên */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-red-600" />
                  6. Nghĩa vụ của các bên
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Nghĩa vụ của người bán:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">Cung cấp đúng sản phẩm/dịch vụ đã công bố.</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">Bảo mật thông tin khách hàng theo chính sách bảo mật.</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">Giải quyết khiếu nại, hỗ trợ kỹ thuật khi khách hàng gặp sự cố.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Nghĩa vụ của khách hàng:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">Cung cấp thông tin chính xác khi mua hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">Thanh toán đầy đủ theo đơn hàng.</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm">Không sao chép, phát tán, kinh doanh lại sản phẩm trái phép.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 7: Biểu phí */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-yellow-600" />
                  7. Biểu phí
                </h2>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-gray-700 mb-3">
                    Giá sản phẩm được niêm yết bằng <span className="font-semibold text-yellow-700">VNĐ</span>, đã bao gồm thuế (nếu có).
                  </p>
                  <p className="text-gray-700">
                    Không thu thêm phí khác ngoài giá niêm yết, trừ trường hợp được thông báo rõ ràng trước khi thanh toán.
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Thông tin liên hệ</h3>
                <p className="text-gray-700 text-sm">
                  Nếu bạn có bất kỳ câu hỏi nào về điều kiện giao dịch này, vui lòng liên hệ với chúng tôi qua:
                </p>
                <p className="text-gray-700 text-sm mt-1">
                  Email: <span className="text-blue-600">thiieltstrenmay@gmail.com</span> | 
                  Điện thoại: <span className="text-blue-600">0964996195</span>
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

export default CompPolicy;