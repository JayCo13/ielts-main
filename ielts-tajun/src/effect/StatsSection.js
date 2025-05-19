import { useEffect, useState } from 'react';
import CountUp from 'react-countup'; // First install: npm install react-countup

const StatsSection = () => {
  return (
    <section className="bg-white text-gray-800 py-5 relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{
          backgroundImage: "url('img/stats.jpeg')", // Add your image path
          opacity: '0.1'
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-12">
          <h2 className="text-gray-400 text-xl font-sans">Số lượng lẫn</h2>
          <h3 className="text-4xl font-bold text-gray-800 font-sans">CHẤT LƯỢNG</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <CountUp
              end={461}
              duration={7}
              className="text-6xl font-bold block mb-4 text-lime-500 font-sans"
            />
            <span className="text-gray-600 font-sans">Số lượng học viên</span>
          </div>
          <div>
            <CountUp
              end={168}
              duration={7}
              className="text-6xl font-bold block mb-4 text-lime-500 font-sans"
            />
            <span className="text-gray-600 font-sans">Tỉ lệ đạt band</span>
          </div>
          <div>
            <CountUp
              end={222}
              duration={7}
              className="text-6xl font-bold block mb-4 text-lime-500 font-sans"
            />
            <span className="text-gray-600 font-sans">Feedbacks</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
