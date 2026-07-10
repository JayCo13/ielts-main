import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { ChevronLeft } from 'lucide-react';
import { API_BASE } from '../../config/api';

const WritingForecastLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const taskId = location.state?.taskId;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    if (!taskId) { setLoading(false); return; }
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_BASE}/student/writing/forecast/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setItem(data);
      } catch (e) {
        setItem(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [taskId, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button onClick={() => navigate('/writing_forecast')} className="flex items-center text-gray-600 hover:text-[#0096b1]">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Forecasts
        </button>
      </div>
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : !item ? (
          <div className="p-8 text-center text-gray-600">Forecast not available</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800">
              <span className="text-[#0096b1] italic mr-2">Writing Forecast:</span>
              <span>{item.title || `Part ${item.part_number}`}</span>
            </h2>
            <div className="mt-1 text-sm text-gray-600">Exam: {item.exam_title}</div>
            <div className="mt-6 prose max-w-none" dangerouslySetInnerHTML={{ __html: item.instructions }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default WritingForecastLayout;