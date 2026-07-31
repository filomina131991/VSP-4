import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon, Table as TableIcon, Sigma, AlignLeft, AlignCenter, AlignRight, AlignJustify, Maximize, Settings } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { MathExtension } from '@aarkue/tiptap-math-extension';
import Modal from '../common/Modal';
import Dropdown from '../common/Dropdown';

interface RichQuestionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editorMinHeight?: string;
  minimal?: boolean;
}

export default function RichQuestionEditor({ content, onChange, placeholder = "Type your question here...", editorMinHeight = "min-h-[150px]", minimal = false }: RichQuestionEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number } | null>(null);
  const [mathModalOpen, setMathModalOpen] = useState(false);
  const [mathInput, setMathInput] = useState('');

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const CustomTable = Table.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        style: {
          default: null,
          parseHTML: element => element.getAttribute('style'),
          renderHTML: attributes => {
            if (!attributes.style) return {};
            return { style: attributes.style };
          },
        },
        class: {
          default: null,
          parseHTML: element => element.getAttribute('class'),
          renderHTML: attributes => {
            if (!attributes.class) return {};
            return { class: attributes.class };
          },
        }
      }
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      MathExtension.configure({ evaluation: false }),
      ImageResize.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image', 'tableCell', 'tableHeader', 'td', 'th'],
      }),
      CustomTable.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${editorMinHeight} ${minimal ? 'p-1 text-sm' : 'p-2'} bg-transparent dark:text-gray-100`,
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          // Insert 4 non-breaking spaces for tab
          view.dispatch(view.state.tr.insertText('\u00A0\u00A0\u00A0\u00A0'));
          return true;
        }
        return false;
      },
      handleTextInput: (view, from, to, text) => {
        if (text === '௰') {
          view.dispatch(view.state.tr.insertText(')', from, to));
          return true;
        }
        return false;
      },
      transformPastedText: (text) => {
        return text.replace(/௰/g, ')');
      },
      transformPastedHTML: (html) => {
        return html.replace(/௰/g, ')');
      },
      handlePaste: (view, event, slice) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          // Auto convert if it looks like LaTeX or wrapped in $
          const isMath = /\\(frac|sqrt|sum|int|alpha|beta|gamma|theta|pi)|[\^_]/i.test(text) || (text.startsWith('$') && text.endsWith('$'));
          if (isMath) {
            event.preventDefault();
            const tex = text.replace(/^\$|\$$/g, '').trim();
            const node = view.state.schema.nodes.inlineMath.create({ latex: tex });
            const tr = view.state.tr.replaceSelectionWith(node);
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      }
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (editor) {
          editor.chain().focus().setImage({ src: base64 }).run();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addMath = useCallback(() => {
    setMathInput('');
    setMathModalOpen(true);
  }, []);

  const handleMathSubmit = () => {
    if (mathInput && editor) {
      editor.chain().focus().insertContent([
        { type: 'inlineMath', attrs: { latex: mathInput } },
        { type: 'text', text: ' ' }
      ]).run();
    }
    setMathModalOpen(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-md shadow-sm overflow-hidden relative group">
      {!minimal && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 p-2 flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Bold"
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Italic"
          >
            <Italic size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Bullet List"
          >
            <List size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Numbered List"
          >
            <ListOrdered size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Align Left"
          >
            <AlignLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Align Center"
          >
            <AlignCenter size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Align Right"
          >
            <AlignRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
            title="Justify"
          >
            <AlignJustify size={18} />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImageUpload} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title="Insert Image"
          >
            <ImageIcon size={18} />
          </button>
          <button
            type="button"
            onClick={addMath}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title="Insert LaTeX Formula"
          >
            <Sigma size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            title="Insert Table"
          >
            <TableIcon size={18} />
          </button>
        </div>
      )}

      {minimal && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white dark:bg-gray-800 shadow rounded border border-gray-200 dark:border-gray-700 flex overflow-hidden">
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700" title="Insert Image">
            <ImageIcon size={14} />
          </button>
          <button type="button" onClick={addMath} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Insert Formula">
            <Sigma size={14} />
          </button>
        </div>
      )}

      {/* Secondary Contextual Toolbar for Tables and Images */}
      {(editor.isActive('table') || editor.isActive('image')) && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-gray-300 dark:border-gray-700 p-2 flex gap-3 flex-wrap items-center text-sm">
          
          {editor.isActive('table') && (
            <>
              <span className="font-semibold text-blue-800 dark:text-blue-300 mr-2 flex items-center gap-1"><TableIcon size={16}/> Table Options:</span>
              
              <div className="flex items-center gap-1">
                <label className="text-gray-600 dark:text-gray-400">Width:</label>
                <Dropdown
                  value={editor.getAttributes('table').style?.includes('width: 100%') ? '100%' : (editor.getAttributes('table').style?.includes('width: 50%') ? '50%' : (editor.getAttributes('table').style?.includes('width: 75%') ? '75%' : 'auto'))}
                  onChange={(v) => {
                    editor.chain().focus().updateAttributes('table', { style: `width: ${v};` }).run();
                  }}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: '50%', label: '50%' },
                    { value: '75%', label: '75%' },
                    { value: '100%', label: '100%' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-1">
                <label className="text-gray-600 dark:text-gray-400">Border:</label>
                <Dropdown
                  value="default"
                  onChange={(v) => {
                    editor.chain().focus().updateAttributes('table', { class: v === 'none' ? 'border-none' : '' }).run();
                  }}
                  options={[
                    { value: 'default', label: 'Default' },
                    { value: 'none', label: 'None' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-1 border-l border-blue-200 dark:border-blue-800 pl-3">
                <button type="button" onClick={() => editor.chain().focus().updateAttributes('table', { style: 'margin-left: 0; margin-right: auto;' }).run()} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded" title="Align Left"><AlignLeft size={16}/></button>
                <button type="button" onClick={() => editor.chain().focus().updateAttributes('table', { style: 'margin-left: auto; margin-right: auto;' }).run()} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded" title="Align Center"><AlignCenter size={16}/></button>
                <button type="button" onClick={() => editor.chain().focus().updateAttributes('table', { style: 'margin-left: auto; margin-right: 0;' }).run()} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded" title="Align Right"><AlignRight size={16}/></button>
              </div>
            </>
          )}

          {editor.isActive('image') && (
            <>
              <span className="font-semibold text-blue-800 dark:text-blue-300 mr-2 flex items-center gap-1"><ImageIcon size={16}/> Image Options:</span>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-gray-600 dark:text-gray-400">W:</label>
                  <input 
                    type="text" 
                    placeholder="auto"
                    className="border rounded w-16 px-1.5 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white text-xs"
                    defaultValue={editor.getAttributes('image').width || ''}
                    onBlur={(e) => editor.chain().focus().updateAttributes('image', { width: e.target.value }).run()}
                    onKeyDown={(e) => { if (e.key === 'Enter') { editor.chain().focus().updateAttributes('image', { width: e.currentTarget.value }).run(); } }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-gray-600 dark:text-gray-400">H:</label>
                  <input 
                    type="text" 
                    placeholder="auto"
                    className="border rounded w-16 px-1.5 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white text-xs"
                    defaultValue={editor.getAttributes('image').height || ''}
                    onBlur={(e) => editor.chain().focus().updateAttributes('image', { height: e.target.value }).run()}
                    onKeyDown={(e) => { if (e.key === 'Enter') { editor.chain().focus().updateAttributes('image', { height: e.currentTarget.value }).run(); } }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 border-l border-blue-200 dark:border-blue-800 pl-3">
                <button type="button" onClick={() => { editor.chain().focus().setTextAlign('left').updateAttributes('image', { style: null }).run(); }} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded" title="Align Left"><AlignLeft size={16}/></button>
                <button type="button" onClick={() => { editor.chain().focus().setTextAlign('center').updateAttributes('image', { style: null }).run(); }} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded" title="Align Center"><AlignCenter size={16}/></button>
                <button type="button" onClick={() => { editor.chain().focus().setTextAlign('right').updateAttributes('image', { style: null }).run(); }} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded" title="Align Right"><AlignRight size={16}/></button>
                <div className="w-px h-4 bg-blue-300 dark:bg-blue-700 mx-1"></div>
                <button type="button" onClick={() => editor.chain().focus().updateAttributes('image', { style: 'float: left; margin: 0 1rem 1rem 0;' }).run()} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-xs font-semibold" title="Wrap Left">W-L</button>
                <button type="button" onClick={() => editor.chain().focus().updateAttributes('image', { style: 'float: right; margin: 0 0 1rem 1rem;' }).run()} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-xs font-semibold" title="Wrap Right">W-R</button>
              </div>
            </>
          )}

        </div>
      )}

      <div 
        className={`bg-white dark:bg-gray-800 relative ${minimal ? 'p-1' : 'p-3 min-h-[150px]'}`}
        onContextMenu={(e) => {
          if (editor?.isActive('table')) {
            e.preventDefault();
            const menuWidth = 180;
            const menuHeight = 360;
            let x = e.clientX;
            let y = e.clientY;
            
            if (x + menuWidth > window.innerWidth) {
               x = window.innerWidth - menuWidth - 10;
            }
            if (y + menuHeight > window.innerHeight) {
               y = window.innerHeight - menuHeight - 10;
            }
            setContextMenu({ visible: true, x, y });
          }
        }}
      >
        {editor && contextMenu?.visible && (
          <div 
            className="fixed bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-md py-1 flex flex-col z-50 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => { editor.chain().focus().addColumnBefore().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Add Col Before</button>
            <button type="button" onClick={() => { editor.chain().focus().addColumnAfter().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Add Col After</button>
            <button type="button" onClick={() => { editor.chain().focus().deleteColumn().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">Delete Col</button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
            <button type="button" onClick={() => { editor.chain().focus().addRowBefore().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Add Row Before</button>
            <button type="button" onClick={() => { editor.chain().focus().addRowAfter().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Add Row After</button>
            <button type="button" onClick={() => { editor.chain().focus().deleteRow().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">Delete Row</button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
            <button type="button" onClick={() => { editor.chain().focus().mergeCells().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Merge Cells</button>
            <button type="button" onClick={() => { editor.chain().focus().splitCell().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Split Cell</button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
            <button type="button" onClick={() => { editor.chain().focus().deleteTable().run(); setContextMenu(null); }} className="px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">Delete Table</button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {mathModalOpen && (
        <Modal onClose={() => setMathModalOpen(false)} disableOutsideClick={true}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">Enter LaTeX formula</h3>
              <a href="https://latexeditor.app/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-md transition-colors flex items-center gap-2 font-semibold text-sm border border-blue-200 dark:border-blue-700 shadow-sm" title="Open Advanced LaTeX Editor in a new tab">
                <Sigma size={16} /> Open Editor
              </a>
            </div>
            <textarea
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              placeholder="e.g., E=mc^2"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 min-h-[120px] font-mono text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setMathModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors">Cancel</button>
              <button onClick={handleMathSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors shadow-sm">Insert Formula</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
