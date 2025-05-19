import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-lime-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div 
        className="absolute w-64 h-64 bg-lime-100 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ top: '20%', left: '15%', opacity: 0.4 }}
      />
      
      <motion.div 
        className="absolute w-72 h-72 bg-green-100 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -30, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{ bottom: '20%', right: '15%', opacity: 0.3 }}
      />

      <div className="max-w-lg w-full backdrop-blur-sm bg-white/30 p-8 rounded-2xl shadow-xl border border-white/20">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Animated 404 icon */}
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 0.9, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-6 inline-block"
          >
            <AlertCircle className="w-24 h-24 text-lime-500" />
          </motion.div>

          <motion.h1 
            className="text-8xl font-bold bg-gradient-to-r from-lime-600 to-green-600 text-transparent bg-clip-text"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            404
          </motion.h1>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 space-y-4"
          >
            <h2 className="text-2xl font-semibold text-gray-800">
              Không tìm thấy trang
            </h2>
            <p className="text-gray-600">
              Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8"
          >
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-lime-500 to-green-500 text-white rounded-xl hover:from-lime-600 hover:to-green-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Home className="w-5 h-5 mr-2" />
              Về Trang Chủ
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFoundPage;