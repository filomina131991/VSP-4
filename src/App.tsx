import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import NetworkStatusBanner from './components/layout/NetworkStatusBanner';

// Eagerly load critical-path pages
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Lazy-load all other pages
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));

const DataManagementPage = React.lazy(() => import('./pages/management/DataManagementPage'));
const ExamManagementPage = React.lazy(() => import('./pages/management/ExamManagementPage'));
const UserManagementPage = React.lazy(() => import('./pages/management/UserManagementPage'));
const StudentManagementPage = React.lazy(() => import('./pages/management/StudentManagementPage'));
const StateResultsPage = React.lazy(() => import('./pages/results/StateResultsPage'));
const SubjectAnalysisPage = React.lazy(() => import('./pages/results/SubjectAnalysisPage'));
const DrillDownPage = React.lazy(() => import('./pages/results/DrillDownPage'));
const FindSchoolPage = React.lazy(() => import('./pages/results/FindSchoolPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ReportsPage = React.lazy(() => import('./pages/reports/ReportsPage'));
const PdfReportPage = React.lazy(() => import('./pages/reports/PdfReportPage'));
const ResourceManagementPage = React.lazy(() => import('./pages/management/ResourceManagementPage'));
const AdvancedAnalysisPage = React.lazy(() => import('./pages/results/AdvancedAnalysisPage'));
const MessageAlertsPage = React.lazy(() => import('./pages/management/MessageAlertsPage').then(m => ({ default: m.MessageAlertsPage })));
const MarksEntry2Page = React.lazy(() => import('./pages/school/MarksEntry2Page'));
const SchoolProfilePage = React.lazy(() => import('./pages/school/SchoolProfilePage'));
const TeacherProfilePage = React.lazy(() => import('./pages/school/TeacherProfilePage'));
const SchoolNotificationsPage = React.lazy(() => import('./pages/management/SchoolNotificationsPage').then(m => ({ default: m.SchoolNotificationsPage })));
const QuestionRepositoryPage = React.lazy(() => import('./pages/repository/QuestionRepositoryPage'));
const QpRepoDashboardPage = React.lazy(() => import('./pages/repository/QpRepoDashboardPage'));
const PaperGeneratorPage = React.lazy(() => import('./pages/repository/PaperGeneratorPage'));
const TeacherManagementPage = React.lazy(() => import('./pages/school/TeacherManagementPage'));
const ChapterManagementPage = React.lazy(() => import('./pages/management/ChapterManagementPage'));
const TaskAssignmentPage = React.lazy(() => import('./pages/repository/TaskAssignmentPage'));
const BackupDataPage = React.lazy(() => import('./pages/management/BackupDataPage'));

// Help Center PWA Module
const HelpCenterLayout = React.lazy(() => import('./help-center/layout/HelpCenterLayout'));
const HelpHomePage = React.lazy(() => import('./help-center/pages/HelpHomePage').then(m => ({ default: m.HelpHomePage })));
const SearchPage = React.lazy(() => import('./help-center/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const FaqPage = React.lazy(() => import('./help-center/pages/FaqPage').then(m => ({ default: m.FaqPage })));
const KnowledgeBasePage = React.lazy(() => import('./help-center/pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const TroubleshootingWizardPage = React.lazy(() => import('./help-center/pages/TroubleshootingWizardPage').then(m => ({ default: m.TroubleshootingWizardPage })));
const ErrorLibraryPage = React.lazy(() => import('./help-center/pages/ErrorLibraryPage').then(m => ({ default: m.ErrorLibraryPage })));
const ErrorDetailPage = React.lazy(() => import('./help-center/pages/ErrorDetailPage').then(m => ({ default: m.ErrorDetailPage })));
const RoleGuidePage = React.lazy(() => import('./help-center/pages/RoleGuidePage').then(m => ({ default: m.RoleGuidePage })));
const WorkflowPage = React.lazy(() => import('./help-center/pages/WorkflowPage').then(m => ({ default: m.WorkflowPage })));
const SupportTicketPage = React.lazy(() => import('./help-center/pages/SupportTicketPage').then(m => ({ default: m.SupportTicketPage })));
const AboutPage = React.lazy(() => import('./help-center/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const BookmarksPage = React.lazy(() => import('./help-center/pages/BookmarksPage').then(m => ({ default: m.BookmarksPage })));
const AdminHelpPage = React.lazy(() => import('./help-center/pages/AdminHelpPage').then(m => ({ default: m.AdminHelpPage })));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const cachedTheme = localStorage.getItem('dashboard_theme');
    document.documentElement.classList.toggle('dark', cachedTheme === 'dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <NetworkStatusBanner />
          <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/results" element={<StateResultsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              {/* Vijayasree Palakkad Help Center (PWA) */}
              <Route path="/help" element={
                <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET', 'SCHOOL']}>
                  <HelpCenterLayout />
                </ProtectedRoute>
              }>
                <Route index element={<HelpHomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="kb" element={<KnowledgeBasePage />} />
                <Route path="wizard" element={<TroubleshootingWizardPage />} />
                <Route path="errors" element={<ErrorLibraryPage />} />
                <Route path="errors/:errorId" element={<ErrorDetailPage />} />
                <Route path="guides/:roleId" element={<RoleGuidePage />} />
                <Route path="workflow" element={<WorkflowPage />} />
                <Route path="tickets" element={<SupportTicketPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="bookmarks" element={<BookmarksPage />} />
                <Route path="admin" element={<AdminHelpPage />} />
              </Route>

              {/* Protected Dashboard Routes with Strict Role Guards */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="home" element={<DashboardPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="notifications" element={<SchoolNotificationsPage />} />
                <Route path="resources" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET', 'SCHOOL', 'SUBJECT_EXPERT', 'RESOURCE_PERSON']}>
                    <ResourceManagementPage />
                  </ProtectedRoute>
                } />
                
                {/* Analysis Modules */}
                <Route path="subject-analysis" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET', 'SCHOOL']}>
                    <SubjectAnalysisPage />
                  </ProtectedRoute>
                } />
                <Route path="drill-down" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <DrillDownPage />
                  </ProtectedRoute>
                } />
                <Route path="find-school" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <FindSchoolPage />
                  </ProtectedRoute>
                } />
                <Route path="advanced-analysis" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <AdvancedAnalysisPage />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="pdf-report" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <PdfReportPage />
                  </ProtectedRoute>
                } />

                {/* Management Module */}
                <Route path="management" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <DataManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="users" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="backup" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER']}>
                    <BackupDataPage />
                  </ProtectedRoute>
                } />
                <Route path="students-manage" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'SCHOOL']}>
                    <StudentManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="exams" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <ExamManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="alerts" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <MessageAlertsPage />
                  </ProtectedRoute>
                } />

                {/* School Specific Modules */}
                <Route path="marks" element={
                  <ProtectedRoute allowedRoles={['SCHOOL', 'TEACHER']}>
                    <MarksEntry2Page />
                  </ProtectedRoute>
                } />
                <Route path="school-profile" element={
                  <ProtectedRoute allowedRoles={['SCHOOL']}>
                    <SchoolProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="teacher-profile" element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <TeacherProfilePage />
                  </ProtectedRoute>
                } />
                
                {/* Question Repository Ecosystem */}
                <Route path="repository" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET', 'SCHOOL', 'SUBJECT_EXPERT', 'RESOURCE_PERSON', 'TEACHER']}>
                    <QuestionRepositoryPage />
                  </ProtectedRoute>
                } />
                <Route path="qp-repo" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'DEO', 'DIET']}>
                    <QpRepoDashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="paper-generator" element={
                  <ProtectedRoute allowedRoles={['SUBJECT_EXPERT', 'WEBMASTER', 'DEO', 'DIET']}>
                    <PaperGeneratorPage />
                  </ProtectedRoute>
                } />
                
                {/* Teacher & Chapter Management */}
                <Route path="teachers" element={
                  <ProtectedRoute allowedRoles={['SCHOOL']}>
                    <TeacherManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="chapters" element={
                  <ProtectedRoute allowedRoles={['WEBMASTER', 'SUBJECT_EXPERT']}>
                    <ChapterManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="assign-tasks" element={
                  <ProtectedRoute allowedRoles={['SUBJECT_EXPERT']}>
                    <TaskAssignmentPage />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
