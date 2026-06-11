import React, { useEffect, useRef } from 'react';

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const isFirstMount = useRef(true);

  // Sync value from parent ONLY when it actually changes from external source (e.g., loading different material)
  // to avoid caret jumping.
  useEffect(() => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      if (currentHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // If editor becomes completely empty (e.g. backspaced all text), set it to empty string
      if (html === '<br>' || html === '<div><br></div>' || html === '') {
        onChange('');
      } else {
        onChange(html);
      }
    }
  };

  const execCommand = (command, argument = null) => {
    document.execCommand(command, false, argument);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleLink = () => {
    const url = prompt("Enter the URL link:");
    if (url) {
      execCommand('createLink', url);
    }
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
      {/* Editor Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => execCommand('undo')}
          title="Undo (Ctrl+Z)"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-medium"
        >
          ↩️
        </button>
        <button
          type="button"
          onClick={() => execCommand('redo')}
          title="Redo (Ctrl+Y)"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-medium"
        >
          ↪️
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Text Formats */}
        <button
          type="button"
          onClick={() => execCommand('bold')}
          title="Bold (Ctrl+B)"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition font-bold text-sm"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          title="Italic (Ctrl+I)"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition italic text-sm"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          title="Underline (Ctrl+U)"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition underline text-sm"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          title="Strikethrough"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition line-through text-sm"
        >
          ab
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Headings */}
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          title="Heading 1"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition font-extrabold text-sm"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          title="Heading 2"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition font-bold text-sm"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<p>')}
          title="Normal Paragraph"
          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-800 rounded-lg transition text-sm"
        >
          P
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Lists */}
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          title="Unordered List"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          •📄
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          title="Ordered List"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          1.📄
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          title="Align Left"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          ⬅️
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          title="Align Center"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          ↔️
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          title="Align Right"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          ➡️
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyFull')}
          title="Justify"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          🟰
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Text & Highlight Color */}
        <div className="flex items-center gap-1 hover:bg-slate-200 p-1 rounded-lg">
          <span className="text-xs font-bold text-slate-500 ml-1">A🖌️</span>
          <input
            type="color"
            onChange={(e) => execCommand('foreColor', e.target.value)}
            title="Text Color"
            className="w-5 h-5 border border-slate-300 rounded cursor-pointer p-0 bg-transparent"
          />
        </div>
        <div className="flex items-center gap-1 hover:bg-slate-200 p-1 rounded-lg">
          <span className="text-xs font-bold text-slate-500 ml-1">✏️🟡</span>
          <input
            type="color"
            defaultValue="#ffff00"
            onChange={(e) => execCommand('hiliteColor', e.target.value)}
            title="Highlight Color"
            className="w-5 h-5 border border-slate-300 rounded cursor-pointer p-0 bg-transparent"
          />
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* Links & Clear format */}
        <button
          type="button"
          onClick={handleLink}
          title="Insert Link"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={() => execCommand('unlink')}
          title="Remove Link"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          📴
        </button>
        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          title="Clear Formatting"
          className="p-2 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm"
        >
          🧹
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="outline-none min-h-[300px] p-6 max-h-[500px] overflow-y-auto prose max-w-none text-slate-700 bg-white leading-relaxed focus:bg-slate-50/10 transition-colors"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '16px',
        }}
        placeholder={placeholder}
      />

      {/* Custom Styles for basic rendering during typing */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          cursor: text;
        }
        [contenteditable] h1 {
          font-size: 1.875rem;
          font-weight: 800;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #1e293b;
        }
        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #1e293b;
        }
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        [contenteditable] p {
          margin-bottom: 1rem;
        }
        [contenteditable] a {
          color: #0d9488;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
