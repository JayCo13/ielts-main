import React, { useEffect } from 'react';
import { checkTokenExpiration } from './utils/auth';
import {
  Routes,
  Route,
  useLocation
} from 'react-router-dom';

import './css/style.css';

import './charts/ChartjsConfig';

// Import pages

import Dashboard from './pages/Dashboard';
import Setting from './pages/Setting';
import Login from './pages/auth/Login';
import CreateStudent from './pages/student/CreateAccount';
import ManageStudent from './pages/student/ManageAccount';
import CreateListeningTest from './pages/test/CreateListeningTest';
import CreateReadingTest from './pages/test/CreateReadingTest';
import CreateSpeakingTest from './pages/test/CreateSpeakingTest';
import CreateWritingTest from './pages/test/CreateWritingTest';
import ManageTest from './pages/test/ManageTest';
import VIPPackageManagement from './pages/admin/VIPPackageManagement';
import PendingTransactions from './pages/admin/PendingTransactions';
import SubscriptionsList from './pages/admin/SubscriptionsList';

function App() {

  const location = useLocation();

  useEffect(() => {
    document.querySelector('html').style.scrollBehavior = 'auto'
    window.scroll({ top: 0 })
    document.querySelector('html').style.scrollBehavior = ''
  }, [location.pathname]); // triggered on route change
  
  // Inside your App component
  useEffect(() => {
      const interval = setInterval(checkTokenExpiration, 60000);
      return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      <Routes>
        <Route exact path="/" element={<Dashboard />} />
        <Route exact path="/settings" element={<Setting />} />
        <Route exact path="/login" element={<Login />} />
        <Route exact path="/create_student" element={<CreateStudent />} />
        <Route exact path="/manage_student" element={<ManageStudent />} />
        <Route exact path="/create_listening_test" element={<CreateListeningTest />} />
        <Route exact path="/create_writing_test" element={<CreateWritingTest />} />
        <Route exact path="/create_reading_test" element={<CreateReadingTest />} />
        <Route exact path="/create_speaking_test" element={<CreateSpeakingTest />} />
        <Route exact path="/manage_test" element={<ManageTest />} />
        
        {/* VIP Package Management Routes */}
        <Route exact path="/packages" element={<VIPPackageManagement />} />
        <Route exact path="/transactions" element={<PendingTransactions />} />
        <Route exact path="/subscriptions" element={<SubscriptionsList />} />

      </Routes>
    </>
  );
}

export default App;
