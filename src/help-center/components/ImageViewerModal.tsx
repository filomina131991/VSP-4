import React from 'react';
import { X, ZoomIn, Download, ExternalLink } from 'lucide-react';
import { useHelpCenter } from '../context/HelpCenterContext';

export const ImageViewerModal: React.FC = () => {
  const { zoomedImage, setZoomedImage } = useHelpCenter();

  if (!zoomedImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-5xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">{zoomedImage.title}</h3>
          </div>
          <button
            onClick={() => setZoomedImage(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-8 flex items-center justify-center bg-slate-950 max-h-[75vh] overflow-auto">
          <img
            src={zoomedImage.url}
            alt={zoomedImage.title}
            className="max-h-[65vh] w-auto object-contain rounded-2xl border border-slate-800 shadow-lg"
          />
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>Click outside or press X to close screenshot preview</span>
          <a
            href={zoomedImage.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 font-semibold hover:underline"
          >
            <span>Open Full Image</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
