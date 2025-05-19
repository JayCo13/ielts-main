import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import ListeningTests from './components/Listening_Fe';
import Speaking from './components/Speaking_Fe';
import Reading from './components/Reading_Fe';
import Writing from './components/Writing_Fe';
import ListeningPage from './exam_elements/listening/main_layout';
import LoginForm from './auth/Login';
import RegisterForm from './auth/Register';
import ForgotPassword from './auth/ForgotPassword';
import ResetPassword from './auth/ResetPassword';
import Profile from './components/Profile';
import ResultReview from './components/ResultReview';
import SpeakingLayout from './exam_elements/speaking/speaking_layout';
import WritingLayout from './exam_elements/writing/writing_layout';
import ExamHistoryDetails from './components/ExamHistoryDetails';
import { startStatusPing, stopStatusPing } from './utils/statusManager';
import AuthCallback from './auth/AuthCallback';
import VIPPackages from './pages/VIPPackages';
import Payment from './pages/Payment';
import VIPConfirmation from './pages/VIPConfirmation';
import MyVIPPackage from './pages/MyVIPPackage';
import TransactionStatus from './pages/TransactionStatus';
import StudentGuard from './StudentGuard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes - require authentication and active status */}
        <Route element={<StudentGuard />}>
          <Route path="/listening_list" element={<ListeningTests />} />
          <Route path="/speaking_list" element={<Speaking />} />
          <Route path="/writing_list" element={<Writing />} />
          <Route path="/reading_list" element={<Reading />} />
          <Route path="/listening_test_room" element={<ListeningPage />} />
          <Route path="/speaking_test_room" element={<SpeakingLayout />} />
          <Route path="/writing_test_room" element={<WritingLayout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/result_review" element={<ResultReview />} />
          <Route path="/exam-result/:resultId" element={<ExamHistoryDetails />} />
          <Route path="/vip-packages" element={<VIPPackages />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/transaction-status" element={<TransactionStatus />} />
          <Route path="/vip-confirmation" element={<VIPConfirmation />} />
          <Route path="/my-vip-package" element={<MyVIPPackage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
