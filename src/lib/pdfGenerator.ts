import { apiClient } from './apiClient';
import toast from 'react-hot-toast';

export interface SchoolPrintData {
  id: string;
  code: string;
  name: string;
  hmName?: string;
  hmMobile?: string;
  phone?: string;
}

export const formatDateTime = (isoString?: string) => {
  if (!isoString) return 'Confirmed & Locked';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
};

export const generateSchoolSubmissionPdf = async ({
  examName,
  listType,
  schoolList,
  confirmations = {},
  eduDistrictName = 'All Educational Districts'
}: {
  examName: string;
  listType: 'confirmed' | 'pending';
  schoolList: SchoolPrintData[];
  confirmations?: Record<string, string>;
  eduDistrictName?: string;
}) => {
  const isConfirmed = listType === 'confirmed';
  const reportTitle = `${examName} - Marks Entry ${isConfirmed ? 'Confirmed & Locked' : 'Pending'} List`;
  const pdfToast = toast.loading('Connecting Puppeteer PDF engine & generating A4 sheet report...');

  try {
    const listRowsHtml = schoolList.map((s, idx) => {
      const lockTime = confirmations[s.id] || confirmations[(s as any)._id] || confirmations[s.code];
      return `
        <tr style="border-bottom: 1px solid #cbd5e1; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
          <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center; font-weight: bold; font-family: monospace; color: ${isConfirmed ? '#059669' : '#d97706'};">${s.code}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0f172a;">${s.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; color: #334155;">${s.hmName || 'N/A'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center; font-family: monospace; color: #334155;">${s.hmMobile || s.phone || 'N/A'}</td>
          ${isConfirmed ? `<td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center; font-family: monospace; color: #059669; font-weight: 700;">${formatDateTime(lockTime)}</td>` : ''}
        </tr>
      `;
    }).join('');

    const html = `
      <div id="a4-printable-report" style="font-family: 'TAU-Paalai', 'TAU-Pallai', system-ui, -apple-system, sans-serif; font-size: 14px; color: #0f172a; padding: 10px;">
        <!-- Header Main Title Block -->
        <div style="width: 100%; text-align: left; margin-bottom: 8px;">
          <span style="font-size: 10px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #64748b; display: block;">VIJAYASREE ACADEMIC EVALUATION PORTAL</span>
          <h1 style="font-size: 22px; font-weight: 900; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: -0.01em; color: #0f172a;">${reportTitle}</h1>
          <p style="font-size: 12px; color: #475569; font-weight: 700; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.04em;">
            District / Scope: ${eduDistrictName} &bull; Total Schools Count: ${schoolList.length}
          </p>
        </div>

        <!-- Separate Row Highlight Banner for Status -->
        <div style="width: 100%; text-align: center; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.12em; padding: 10px 14px; margin-top: 12px; margin-bottom: 12px; border-radius: 8px; ${isConfirmed ? 'background-color: #d1fae5; color: #065f46; border: 1.5px solid #10b981;' : 'background-color: #fef3c7; color: #92400e; border: 1.5px solid #f59e0b;'}">
          ${isConfirmed ? 'SUBMISSIONS CONFIRMED & FINALIZED' : 'SUBMISSIONS PENDING'}
        </div>

        <!-- Full Row Divider Line Below Header -->
        <div style="width: 100%; height: 2px; background-color: #0f172a; margin-bottom: 16px;"></div>

        <!-- Proper Bordered Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #94a3b8; margin-top: 8px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1.5px solid #94a3b8; padding: 11px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; width: 6%; text-align: center; color: #0f172a;">Sl No</th>
              <th style="border: 1.5px solid #94a3b8; padding: 11px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; width: 14%; text-align: center; color: #0f172a;">School Code</th>
              <th style="border: 1.5px solid #94a3b8; padding: 11px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; width: 32%; text-align: left; color: #0f172a;">School Name</th>
              <th style="border: 1.5px solid #94a3b8; padding: 11px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; width: 18%; text-align: left; color: #0f172a;">Headmaster Name</th>
              <th style="border: 1.5px solid #94a3b8; padding: 11px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; width: 14%; text-align: center; color: #0f172a;">Mobile / Phone</th>
              ${isConfirmed ? `<th style="border: 1.5px solid #94a3b8; padding: 11px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; width: 16%; text-align: center; color: #0f172a;">Confirm Date & Time</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${listRowsHtml.length > 0 ? listRowsHtml : `<tr><td colSpan="${isConfirmed ? 6 : 5}" style="border: 1px solid #cbd5e1; padding: 24px; text-align: center; color: #94a3b8; font-weight: 700;">No school submissions matching current scope filter.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;

    const response = await apiClient.post('/pdf/generate', 
      { html, baseUrl: window.location.origin, title: reportTitle }, 
      { responseType: 'blob', timeout: 120000 }
    );

    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const safeTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);

    toast.success('Puppeteer A4 PDF generated and downloaded successfully!', { id: pdfToast });
  } catch (err: any) {
    console.error("PDF Generation Error Details:", err);
    const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
    toast.error(`Failed to generate PDF: ${serverError}`, { id: pdfToast });
  }
};

export const printSchoolSubmissionWindow = (
  title: string, 
  schoolList: SchoolPrintData[], 
  showDateTime: boolean = false, 
  confirmations: Record<string, string> = {}
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error("Please allow popups to print report list");
    return;
  }

  const isConfirmed = showDateTime;

  const listRowsHtml = schoolList.map((s, idx) => {
    const lockTime = confirmations[s.id] || confirmations[(s as any)._id] || confirmations[s.code];
    return `
      <tr style="border-bottom: 1px solid #cbd5e1; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
        <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center; font-weight: bold; font-family: monospace;">${s.code}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; font-weight: bold; text-transform: uppercase;">${s.name}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px;">${s.hmName || 'N/A'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center; font-family: monospace;">${s.hmMobile || s.phone || 'N/A'}</td>
        ${showDateTime ? `<td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; text-align: center; font-family: monospace; font-weight: 700; color: #059669;">${formatDateTime(lockTime)}</td>` : ''}
      </tr>
    `;
  }).join('');

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'TAU-Paalai', 'TAU-Pallai', system-ui, -apple-system, sans-serif; font-size: 14px; color: #0f172a; padding: 20px; }
          h2 { text-transform: uppercase; font-size: 20px; font-weight: 800; margin-bottom: 5px; margin-top: 0; }
          p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
          table { width: 100%; border-collapse: collapse; border: 1.5px solid #94a3b8; margin-top: 10px; }
          th { background-color: #f1f5f9; padding: 10px 12px; font-size: 11px; text-transform: uppercase; font-weight: 900; border: 1.5px solid #94a3b8; color: #0f172a; }
          td { border: 1px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <h2>${title}</h2>
            <p>Generated Official List &bull; Total Schools: ${schoolList.length}</p>
          </div>
          <button onclick="window.print();" style="background: #000; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer;">
            Print Report
          </button>
        </div>

        <div style="width: 100%; text-align: center; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.12em; padding: 10px 14px; margin-bottom: 12px; border-radius: 8px; ${isConfirmed ? 'background-color: #d1fae5; color: #065f46; border: 1.5px solid #10b981;' : 'background-color: #fef3c7; color: #92400e; border: 1.5px solid #f59e0b;'}">
          ${isConfirmed ? 'SUBMISSIONS CONFIRMED & FINALIZED' : 'SUBMISSIONS PENDING'}
        </div>

        <div style="width: 100%; height: 2px; background-color: #0f172a; margin-bottom: 16px;"></div>

        <table>
          <thead>
            <tr>
              <th style="width: 6%; text-align: center;">Sl No</th>
              <th style="width: 14%; text-align: center;">School Code</th>
              <th style="width: 32%; text-align: left;">School Name</th>
              <th style="width: 18%; text-align: left;">Headmaster Name</th>
              <th style="width: 14%; text-align: center;">Mobile / Phone</th>
              ${showDateTime ? `<th style="width: 16%; text-align: center;">Confirm Date & Time</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${listRowsHtml}
          </tbody>
        </table>
        <script>
          setTimeout(() => {
            window.print();
          }, 300);
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
