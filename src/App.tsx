import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { TermProvider } from "@/lib/termContext";

import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminInstructors from "@/pages/admin/AdminInstructors";
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminClassrooms from "@/pages/admin/AdminClassrooms";
import AdminSchedules from "@/pages/admin/AdminSchedules";
import AdminEnrollments from "@/pages/admin/AdminEnrollments";
import AdminReports from "@/pages/admin/AdminReports";
import AdminAlerts from "@/pages/admin/AdminAlerts";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminTerms from "@/pages/admin/AdminTerms";

// Instructor
import InstructorDashboard from "@/pages/instructor/InstructorDashboard";
import InstructorCourses from "@/pages/instructor/InstructorCourses";
import InstructorSessions from "@/pages/instructor/InstructorSessions";
import InstructorSessionDetail from "@/pages/instructor/InstructorSessionDetail";
import InstructorSessionLive from "@/pages/instructor/InstructorSessionLive";
import InstructorSessionQR from "@/pages/instructor/InstructorSessionQR";
import InstructorLive from "@/pages/instructor/InstructorLive";
import InstructorQR from "@/pages/instructor/InstructorQR";
import InstructorHeadcount from "@/pages/instructor/InstructorHeadcount";
import InstructorReports from "@/pages/instructor/InstructorReports";
import InstructorAlerts from "@/pages/instructor/InstructorAlerts";
import InstructorSettings from "@/pages/instructor/InstructorSettings";

// Student
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentCourses from "@/pages/student/StudentCourses";
import StudentCourseDetail from "@/pages/student/StudentCourseDetail";
import StudentSchedule from "@/pages/student/StudentSchedule";
import StudentScan from "@/pages/student/StudentScan";
import StudentHistory from "@/pages/student/StudentHistory";
import StudentWarnings from "@/pages/student/StudentWarnings";
import StudentSettings from "@/pages/student/StudentSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TermProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
              <Route path="/admin/instructors" element={<ProtectedRoute allowedRoles={['admin']}><AdminInstructors /></ProtectedRoute>} />
              <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin']}><AdminCourses /></ProtectedRoute>} />
              <Route path="/admin/classrooms" element={<ProtectedRoute allowedRoles={['admin']}><AdminClassrooms /></ProtectedRoute>} />
              <Route path="/admin/terms" element={<ProtectedRoute allowedRoles={['admin']}><AdminTerms /></ProtectedRoute>} />
              <Route path="/admin/schedules" element={<ProtectedRoute allowedRoles={['admin']}><AdminSchedules /></ProtectedRoute>} />
              <Route path="/admin/enrollments" element={<ProtectedRoute allowedRoles={['admin']}><AdminEnrollments /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/alerts" element={<ProtectedRoute allowedRoles={['admin']}><AdminAlerts /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

              {/* Instructor Routes */}
              <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorDashboard /></ProtectedRoute>} />
              <Route path="/instructor/courses" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorCourses /></ProtectedRoute>} />
              <Route path="/instructor/sessions" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSessions /></ProtectedRoute>} />
              <Route path="/instructor/sessions/:id" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSessionDetail /></ProtectedRoute>} />
              <Route path="/instructor/sessions/:id/live" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSessionLive /></ProtectedRoute>} />
              <Route path="/instructor/sessions/:id/qr" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSessionQR /></ProtectedRoute>} />
              <Route path="/instructor/live" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorLive /></ProtectedRoute>} />
              <Route path="/instructor/qr" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorQR /></ProtectedRoute>} />
              <Route path="/instructor/headcount" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorHeadcount /></ProtectedRoute>} />
              <Route path="/instructor/reports" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorReports /></ProtectedRoute>} />
              <Route path="/instructor/alerts" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorAlerts /></ProtectedRoute>} />
              <Route path="/instructor/settings" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSettings /></ProtectedRoute>} />

              {/* Student Routes */}
              <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><StudentCourses /></ProtectedRoute>} />
              <Route path="/student/courses/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentCourseDetail /></ProtectedRoute>} />
              <Route path="/student/schedule" element={<ProtectedRoute allowedRoles={['student']}><StudentSchedule /></ProtectedRoute>} />
              <Route path="/student/scan" element={<ProtectedRoute allowedRoles={['student']}><StudentScan /></ProtectedRoute>} />
              <Route path="/student/history" element={<ProtectedRoute allowedRoles={['student']}><StudentHistory /></ProtectedRoute>} />
              <Route path="/student/warnings" element={<ProtectedRoute allowedRoles={['student']}><StudentWarnings /></ProtectedRoute>} />
              <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><StudentSettings /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </TermProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
