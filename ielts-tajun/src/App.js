import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { initializeAuth } from './utils/authUtils';
import { ensureNotifyPermission } from './utils/notifyPermission';
import ChatWidget from './components/ChatWidget';
import Achievement from './components/Achievements';
import HomePage from './components/HomePage';
import ListeningTests from './components/Listening_Fe';
import Speaking from './components/Speaking_Fe';
import Reading from './components/Reading_Fe';
import ReadingForecast from './components/ReadingForecast';
import Writing from './components/Writing_Fe';
import WritingForecast from './components/WritingForecast';
import ListeningForecast from './components/ListeningForecast';
import ListeningPage from './exam_elements/listening/main_layout';
import ReadingPage from './exam_elements/reading/main_layout';
import LoginForm from './auth/Login';
import RegisterForm from './auth/Register';
import ForgotPassword from './auth/ForgotPassword';
import ResetPassword from './auth/ResetPassword';
import Profile from './components/Profile';
import ResultReviewRd from './components/ResultReviewRd';
import ResultReview from './components/ResultReview';
import SpeakingLayout from './exam_elements/speaking/speaking_layout';
import WritingLayout from './exam_elements/writing/writing_layout';
import WritingForecastLayout from './exam_elements/writing/forecast_layout';
import ExamHistory from './components/ExamHistory';
import AuthCallback from './auth/AuthCallback';
import VIPPackages from './pages/VIPPackages';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import VIPConfirmation from './pages/VIPConfirmation';
import MyVIPPackage from './pages/MyVIPPackage';
import TransactionStatus from './pages/TransactionStatus';
import StudentGuard from './StudentGuard';
import AboutUs from './pages/adsense/AboutUs';
import PrivacyPolicy from './pages/adsense/PrivacyPolicy';
import PaymentPolicy from './pages/adsense/PaymentPolicy';
import CompPolicy from './pages/adsense/CompPolicy';
import DeliPolicy from './pages/adsense/DeliPolicy';
import Permission from './pages/adsense/Permission';
import NotFoundPage from './pages/NotFoundPage';
import NewWords from './components/NewWords';
import StudentDictation from './components/StudentDictation';
import Instruction from './pages/Instruction';

// Wrapper components that force remount when navigating to the same route
// (e.g., from result review → retake mode). React Router v6 doesn't 
// remount the same component on same-route navigation, so we use 
// location.key as React key to force full unmount+remount.
function ListeningPageWrapper() {
  const location = useLocation();
  return <ListeningPage key={location.key} />;
}

function ReadingPageWrapper() {
  const location = useLocation();
  return <ReadingPage key={location.key} />;
}

function App() {
  useEffect(() => {
    // Initialize authentication and device tracking
    initializeAuth();
    // If already logged in on load, ask for notification permission early.
    if (localStorage.getItem('token')) ensureNotifyPermission();
  }, []);

  return (
    <Router>
      <NotificationProvider>
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/instruction" element={<Instruction />} />
          <Route path="/achievements" element={<Achievement />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/payment-policy" element={<PaymentPolicy />} />
          <Route path="/comp-policy" element={<CompPolicy />} />
          <Route path="/deli-policy" element={<DeliPolicy />} />
          <Route path="/permission" element={<Permission />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />

          {/* Protected routes - require authentication and active status */}
          <Route element={<StudentGuard />}>
            <Route path="/listening_list" element={<ListeningTests />} />
            <Route path="/speaking_list" element={<Speaking />} />
            <Route path="/writing_list" element={<Writing />} />
            <Route path="/listening_forecast" element={<ListeningForecast />} />
            <Route path="/writing_forecast" element={<WritingForecast />} />
            <Route path="/reading_list" element={<Reading />} />
            <Route path="/reading_forecast" element={<ReadingForecast />} />
            <Route path="/listening_test_room" element={<ListeningPageWrapper />} />
            <Route path="/reading_test_room" element={<ReadingPageWrapper />} />
            <Route path="/speaking_test_room" element={<SpeakingLayout />} />
            <Route path="/writing_test_room" element={<WritingLayout />} />
            <Route path="/writing_forecast_view" element={<WritingForecastLayout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/exam-history" element={<ExamHistory />} />
            <Route path="/result_review" element={<ResultReview />} />
            <Route path="/result_review_rd" element={<ResultReviewRd />} />
            <Route path="/vip-packages" element={<VIPPackages />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/transaction-status" element={<TransactionStatus />} />
            <Route path="/vip-confirmation" element={<VIPConfirmation />} />
            <Route path="/my-vip-package" element={<MyVIPPackage />} />
            <Route path="/new-vocabulary" element={<NewWords />} />
            <Route path="/dictation" element={<StudentDictation />} />
          </Route>

          {/* Catch-all route for 404 - must be last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {/* Center-student chat widget (self-hides for non-center users) */}
        <ChatWidget />
      </NotificationProvider>
    </Router>
  );
}

export default App;
