import os

filepath = 'd:/Tamil Vizuthukal App/VSP 4/src/components/common/ExamSelect.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useAuth import
import_stmt = "import { FileText, ChevronDown, Search, Check } from 'lucide-react';"
replacement_import = "import { FileText, ChevronDown, Search, Check } from 'lucide-react';\nimport { useAuth } from '../../context/AuthContext';"
content = content.replace(import_stmt, replacement_import)

# Add status to Exam interface
interface_stmt = """interface Exam {
  id: string;
  name: string;
  academicYear?: string;
  standard?: string;
  confirmedSchools?: string[];
}"""
replacement_interface = """interface Exam {
  id: string;
  name: string;
  academicYear?: string;
  standard?: string;
  confirmedSchools?: string[];
  status?: string;
}"""
content = content.replace(interface_stmt, replacement_interface)

# Add useAuth to component
comp_start = """}) => {
  const [isOpen, setIsOpen] = useState(false);"""
replacement_comp_start = """}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);"""
content = content.replace(comp_start, replacement_comp_start)

# Add helper for status rendering
helper_stmt = """  const isConfigured = selectedExamId ? configuredIds.includes(selectedExamId) : false;

  return ("""
replacement_helper = """  const isConfigured = selectedExamId ? configuredIds.includes(selectedExamId) : false;
  const isSchoolView = user?.role === 'SCHOOL';

  const renderStatusBadge = (exam: any, isSelected: boolean) => {
    if (isSchoolView) {
      const configured = configuredIds.includes(exam.id);
      return (
        <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${configured ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
          {configured ? '✓ Configured' : 'Configure Required'}
        </span>
      );
    }

    // For Admin users, show the actual exam status
    let statusText = exam.status || 'ACTIVE';
    let statusColor = 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
    const s = (exam.status || '').toUpperCase();
    if (s === 'PUBLISHED') statusColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
    else if (s === 'ACTIVE') statusColor = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
    else if (s === 'DRAFT') statusColor = 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-400';
    else if (s === 'COMPLETED' || s === 'ARCHIVED') statusColor = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400';

    return (
      <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}>
        {statusText}
      </span>
    );
  };

  const getBorderClasses = (exam: any) => {
    if (!isSchoolView) return 'bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-600';
    const configured = configuredIds.includes(exam.id);
    return configured 
      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600/80 hover:border-emerald-500 shadow-emerald-500/10'
      : 'bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-600';
  };

  return ("""
content = content.replace(helper_stmt, replacement_helper)

# Update the rendering of the selected exam badge
selected_badge_stmt = """              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isConfigured ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
                  {isConfigured ? '✓ Configured' : 'Configure Required'}
                </span>
                {selectedExam.academicYear && ("""
replacement_selected_badge = """              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {renderStatusBadge(selectedExam, true)}
                {selectedExam.academicYear && ("""
content = content.replace(selected_badge_stmt, replacement_selected_badge)

# Update border logic for selected exam
border_stmt = """        className={`w-full text-left px-3.5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border ${
          isConfigured
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600/80 hover:border-emerald-500 shadow-emerald-500/10'
            : 'bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-600'
        }`}"""
replacement_border = """        className={`w-full text-left px-3.5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border ${selectedExam ? getBorderClasses(selectedExam) : 'bg-white dark:bg-[#161b22] border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-600'}`}"""
content = content.replace(border_stmt, replacement_border)

# Update dropdown rendering items
dropdown_stmt = """                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${exConfigured ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                            {exConfigured ? '✓ Configured' : 'Configure Required'}
                          </span>
                          {ex.academicYear && ("""
replacement_dropdown = """                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {renderStatusBadge(ex, false)}
                          {ex.academicYear && ("""
content = content.replace(dropdown_stmt, replacement_dropdown)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
