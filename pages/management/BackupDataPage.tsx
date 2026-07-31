import React, { useState, useRef, useMemo } from 'react';
import { 
  DatabaseBackup, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface CollectionMeta {
  name: string;
  desc: string;
  category: 'System' | 'Data' | 'Config';
}

const COLLECTIONS_METADATA: CollectionMeta[] = [
  { name: 'User', desc: 'System users, logins, passwords, roles, and status flags', category: 'System' },
  { name: 'MainDistrict', desc: 'Major educational districts or regional offices', category: 'Config' },
  { name: 'District', desc: 'Revenue districts in the state', category: 'Config' },
  { name: 'EducationalDistrict', desc: 'Educational sub-districts and blocks', category: 'Config' },
  { name: 'School', desc: 'School profiles, HM details, UDISE codes, and emails', category: 'Data' },
  { name: 'Exam', desc: 'Board and general exam schedules and setups', category: 'Config' },
  { name: 'Student', desc: 'Enrollment records, student profiles, and classes', category: 'Data' },
  { name: 'Mark', desc: 'Marks entry data, locking status, and scores', category: 'Data' },
  { name: 'Preference', desc: 'Global app configurations, settings, and flags', category: 'System' },
  { name: 'Grade', desc: 'Grade boundaries and recalculation configs', category: 'Config' },
  { name: 'BlueprintTemplate', desc: 'Question paper blueprints and templates', category: 'Config' },
  { name: 'Subject', desc: 'Subject list, syllabus mappings, and credits', category: 'Config' },
  { name: 'Resource', desc: 'Downloads, guides, circulars, and study materials', category: 'Config' },
  { name: 'MessageAlert', desc: 'System-wide announcement banners and alerts', category: 'Config' },
  { name: 'AdminMarkGroupConfig', desc: 'Marks boundaries groups configurations', category: 'Config' },
  { name: 'SchoolExamConfig', desc: 'Exam confirmations and custom school configurations', category: 'Config' },
  { name: 'Question', desc: 'Central repositories for question papers items', category: 'Config' },
  { name: 'QuestionVersion', desc: 'Change history and versions of repository questions', category: 'Config' },
  { name: 'SubjectChapter', desc: 'Subject units and chapters configurations', category: 'Config' },
  { name: 'SchoolTarget', desc: 'Annual achievement targets for registered schools', category: 'Data' },
  { name: 'QuestionTask', desc: 'Workflows, assignments, and tasks for teachers', category: 'Data' },
  { name: 'QuestionPaperBlueprint', desc: 'Saves generated question papers layouts', category: 'Config' },
  { name: 'AuditLog', desc: 'Webmaster activity logs and history trails', category: 'System' }
];

const BackupDataPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState<string | null>(null); // null = idle, 'all' = full, 'CollectionName' = specific
  const [isImporting, setIsImporting] = useState(false);
  const [parsedBackup, setParsedBackup] = useState<any>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter collections list
  const filteredCollections = useMemo(() => {
    return COLLECTIONS_METADATA.filter(col => 
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleExport = async (collectionName?: string) => {
    try {
      setIsExporting(collectionName || 'all');
      const url = collectionName 
        ? `/management/backup/export?collection=${collectionName}`
        : '/management/backup/export';
      
      const res = await apiClient.get(url, { timeout: 180000 }); // 3-minute timeout for large exports
      
      const dataStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = collectionName 
        ? `vsp_${collectionName.toLowerCase()}_backup_${new Date().toISOString().slice(0, 10)}.json`
        : `vsp_full_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      toast.success(collectionName ? `${collectionName} collection exported!` : 'Full database backup exported!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export data.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || typeof json !== 'object' || !json.data) {
          toast.error('Invalid backup file structure.');
          setParsedBackup(null);
          return;
        }
        setParsedBackup(json);
        setSelectedCollections(Object.keys(json.data));
        toast.success('Backup file parsed successfully!');
      } catch (err) {
        toast.error('Failed to parse JSON file.');
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleCollection = (colName: string) => {
    setSelectedCollections(prev => 
      prev.includes(colName) 
        ? prev.filter(c => c !== colName)
        : [...prev, colName]
    );
  };

  const handleSelectAll = () => {
    if (!parsedBackup) return;
    setSelectedCollections(Object.keys(parsedBackup.data));
  };

  const handleSelectNone = () => {
    setSelectedCollections([]);
  };

  const handleImport = async () => {
    if (!parsedBackup || selectedCollections.length === 0) return;

    const result = await Swal.fire({
      title: 'Are you absolutely sure?',
      html: `You are about to restore <strong>${selectedCollections.length}</strong> collections.<br/><br/>
             <div class="text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl text-xs border border-red-200 font-bold uppercase tracking-wider text-center">
               Warning: This will delete existing records in these collections and replace them. This cannot be undone!
             </div><br/>
             Type <strong>RESTORE</strong> to confirm:`,
      input: 'text',
      inputPlaceholder: 'RESTORE',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Clear & Restore Data',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (value !== 'RESTORE') {
          return 'You must type RESTORE to confirm!';
        }
      }
    });

    if (result.isConfirmed) {
      try {
        setIsImporting(true);
        const res = await apiClient.post('/management/backup/import', {
          backupData: parsedBackup,
          selectedCollections
        }, { timeout: 180000 });
        
        await Swal.fire({
          title: 'Success!',
          text: res.data?.message || 'Data restored successfully!',
          icon: 'success',
          confirmButtonColor: '#3085d6'
        });

        setParsedBackup(null);
        setFileName('');
        setSelectedCollections([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Failed to import backup data.');
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleRestoreCollectionClick = async (colName: string) => {
    const { value: file } = await Swal.fire({
      title: `Restore ${colName} Collection`,
      text: `Upload a backup JSON file containing data for the "${colName}" collection.`,
      input: 'file',
      inputAttributes: {
        'accept': '.json',
        'aria-label': 'Upload your backup JSON file'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload & Review',
      confirmButtonColor: '#3085d6'
    });

    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json || typeof json !== 'object' || !json.data) {
            toast.error('Invalid backup file structure.');
            return;
          }
          
          if (!json.data[colName]) {
            toast.error(`The uploaded backup file does not contain data for the "${colName}" collection.`);
            return;
          }

          const count = json.data[colName].length;

          const confirmResult = await Swal.fire({
            title: `Confirm Restoring ${colName}`,
            html: `You are about to restore the <strong>${colName}</strong> collection with <strong>${count}</strong> records.<br/><br/>
                   <div class="text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl text-xs border border-red-200 font-bold uppercase tracking-wider text-center">
                     Warning: This will clear existing records in the "${colName}" collection. This cannot be undone!
                   </div><br/>
                   Type <strong>RESTORE</strong> to confirm:`,
            input: 'text',
            inputPlaceholder: 'RESTORE',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: `Clear & Restore ${colName}`,
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
              if (value !== 'RESTORE') {
                return 'You must type RESTORE to confirm!';
              }
            }
          });

          if (confirmResult.isConfirmed) {
            setIsImporting(true);
            const res = await apiClient.post('/management/backup/import', {
              backupData: json,
              selectedCollections: [colName]
            });
            
            await Swal.fire({
              title: 'Restored!',
              text: `Successfully restored ${count} records to "${colName}".`,
              icon: 'success',
              confirmButtonColor: '#3085d6'
            });
          }
        } catch (err) {
          toast.error('Failed to parse the uploaded JSON file.');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tighter uppercase flex items-center gap-3">
              <DatabaseBackup size={32} className="text-gray-400" />
              Backup & Restore Data
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Export your complete database collections to a secure file or restore from an existing backup.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Full Export Card */}
        <div className="bg-white dark:bg-[#161b22] p-8 rounded-3xl border border-gray-150 dark:border-[#30363d] shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-wider">Export Database</h2>
              <p className="text-xs text-gray-400 mt-1 font-bold">GENERATE A COMPLETE DATA BACKUP</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              Click below to download all database collections bundled into a single JSON file. Save this file securely to restore the database later.
            </p>
          </div>
          <button
            onClick={() => handleExport()}
            disabled={isExporting !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/15 disabled:opacity-50 cursor-pointer"
          >
            {isExporting === 'all' ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Exporting Data...
              </>
            ) : (
              <>
                <Download size={16} />
                Export & Download Full Backup
              </>
            )}
          </button>
        </div>

        {/* Full Import Card */}
        <div className="bg-white dark:bg-[#161b22] p-8 rounded-3xl border border-gray-150 dark:border-[#30363d] shadow-sm flex flex-col space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-wider">Restore Database</h2>
              <p className="text-xs text-amber-500 mt-1 font-bold">IMPORT FROM BACKUP FILE</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              Upload a previously exported JSON backup file to overwrite/restore selected collections in the database.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-50 transition-colors rounded-2xl p-6 cursor-pointer bg-gray-50/50 dark:bg-[#0d1117]/30">
              <Upload size={24} className="text-gray-400 mb-2" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {fileName ? fileName : 'Select Backup JSON File'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {parsedBackup && (
              <div className="border border-gray-150 dark:border-[#30363d] rounded-2xl p-4 bg-gray-50/50 dark:bg-[#0d1117]/30 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div>
                    <p className="text-xs font-black uppercase text-gray-900 dark:text-white">Backup Details</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Exported: {new Date(parsedBackup.exportedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={handleSelectAll}
                      className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                    >
                      All
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSelectNone}
                      className="text-[9px] font-black uppercase text-gray-500 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {Object.keys(parsedBackup.data).map((colName) => {
                    const count = parsedBackup.data[colName]?.length || 0;
                    const isSelected = selectedCollections.includes(colName);
                    return (
                      <label 
                        key={colName} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300' 
                            : 'bg-white dark:bg-[#161b22] border-gray-150 dark:border-[#30363d] text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCollection(colName)}
                            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span>{colName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          isSelected ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                          {count} rows
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex gap-2.5">
                  <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed font-bold uppercase">
                    Warning: Clicking restore will empty and overwrite the selected collections. Proceed with caution.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting || selectedCollections.length === 0}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Restoring Data...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Restore Selected ({selectedCollections.length}) Collections
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collection-Wise Management Section */}
      <div className="bg-white dark:bg-[#161b22] border border-gray-150 dark:border-[#30363d] rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
          <div>
            <h2 className="text-lg font-black uppercase text-gray-900 dark:text-white tracking-wider flex items-center gap-2">
              <Database size={20} className="text-gray-400" />
              Collection-Wise Backup & Restore
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Export or restore specific collections individually.</p>
          </div>
          <div className="relative flex items-center max-w-sm w-full">
            <Search className="absolute left-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search collections..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all dark:text-white"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-gray-150 dark:border-[#30363d] rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-[#30363d] text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <th className="px-6 py-4">Collection</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCollections.length > 0 ? (
                filteredCollections.map((col) => {
                  const isThisExporting = isExporting === col.name;
                  return (
                    <tr 
                      key={col.name}
                      className="border-b border-gray-100 dark:border-[#30363d] last:border-none hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Database size={16} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-black uppercase text-gray-900 dark:text-white tracking-wider">
                            {col.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                        {col.desc}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          col.category === 'System' 
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' 
                            : col.category === 'Data'
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                        }`}>
                          {col.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleExport(col.name)}
                            disabled={isExporting !== null}
                            className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 py-2 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isThisExporting ? (
                              <RefreshCw className="animate-spin" size={12} />
                            ) : (
                              <ArrowDownRight size={12} />
                            )}
                            Export
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestoreCollectionClick(col.name)}
                            disabled={isImporting}
                            className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 py-2 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ArrowUpRight size={12} />
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                    No matching collections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackupDataPage;
