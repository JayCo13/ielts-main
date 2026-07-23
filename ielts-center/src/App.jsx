import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, Users, School, Wallet, Activity, MessageSquare } from 'lucide-react'
import { isAuthed, getRole } from './lib/auth'
import Layout from './components/Layout'
// Login carries the Lottie (lottie-web) — lazy-load it so it doesn't weigh
// down the dashboard bundle.
const Login = lazy(() => import('./pages/Login'))
import CenterOverview from './pages/center/Overview'
import Members from './pages/center/Members'
import Classes from './pages/center/Classes'
import WalletPage from './pages/center/Wallet'
import TeacherOverview from './pages/teacher/Overview'
import ClassStudents from './pages/teacher/ClassStudents'
import StudentHistory from './pages/teacher/StudentHistory'
import Realtime from './pages/Realtime'
import Chat from './pages/teacher/Chat'

const centerNav = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/teachers', label: 'Giáo viên', icon: GraduationCap },
  { to: '/students', label: 'Học viên', icon: Users },
  { to: '/classes', label: 'Lớp học', icon: School },
  { to: '/realtime', label: 'Trực tuyến', icon: Activity },
  { to: '/wallet', label: 'Ví & VIP', icon: Wallet },
]

const teacherNav = [
  { to: '/teacher', label: 'Lớp của tôi', icon: School, end: true },
  { to: '/teacher/realtime', label: 'Trực tuyến', icon: Activity },
  { to: '/teacher/chat', label: 'Tin nhắn', icon: MessageSquare },
]

// Guard returns the Layout (with its <Outlet/>) or a redirect.
function Protected({ role, nav, title }) {
  if (!isAuthed()) return <Navigate to="/login" replace />
  const r = getRole()
  if (role && r !== role) return <Navigate to={r === 'teacher' ? '/teacher' : '/'} replace />
  return <Layout nav={nav} title={title} />
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-400">Đang tải…</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Center dashboard */}
      <Route element={<Protected role="center" nav={centerNav} title="Quản lý Trung tâm" />}>
        <Route path="/" element={<CenterOverview />} />
        <Route path="/teachers" element={<Members key="teachers" kind="teacher" />} />
        <Route path="/students" element={<Members key="students" kind="student" />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/realtime" element={<Realtime scope="center" />} />
        <Route path="/wallet" element={<WalletPage />} />
      </Route>

      {/* Teacher dashboard */}
      <Route element={<Protected role="teacher" nav={teacherNav} title="Bảng điều khiển Giáo viên" />}>
        <Route path="/teacher" element={<TeacherOverview />} />
        <Route path="/teacher/realtime" element={<Realtime scope="teacher" />} />
        <Route path="/teacher/chat" element={<Chat />} />
        <Route path="/teacher/classes/:classId" element={<ClassStudents />} />
        <Route path="/teacher/students/:userId" element={<StudentHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
