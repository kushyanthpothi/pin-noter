// src/components/EditNote.js
import React, { useState } from 'react';
import '../styles/EditNote.css';

const EditNote = ({ note, onSave, onClose }) => {
  const [editedNote, setEditedNote] = useState({ ...note });
  const [listType, setListType] = useState(null);
  const [numberCounter, setNumberCounter] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editedNote.title.trim() || editedNote.content.trim()) {
      onSave(editedNote);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newContent = editedNote.content.substring(0, start) + '    ' + editedNote.content.substring(end);
      setEditedNote({ ...editedNote, content: newContent });
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    } else if (e.key === 'Enter') {
      if (listType) {
        e.preventDefault();
        const lines = editedNote.content.split('\n');
        const currentLine = lines[lines.length - 1];
        const isEmptyLine = currentLine.replace(/^(\s*)(•|\d+\.\s)?\s*$/, '') === '';

        if (isEmptyLine) {
          setListType(null);
          setNumberCounter(1);
          setEditedNote({
            ...editedNote,
            content: editedNote.content.trimEnd() + '\n'
          });
        } else {
          const newLine = listType === 'bullet' 
            ? '• ' 
            : `${numberCounter}. `;
          
          setEditedNote({
            ...editedNote,
            content: editedNote.content + '\n' + newLine
          });

          if (listType === 'number') {
            setNumberCounter(numberCounter + 1);
          }
        }
      }
    }
  };

  const startBulletList = () => {
    const newContent = editedNote.content + (editedNote.content && !editedNote.content.endsWith('\n') ? '\n' : '') + '• ';
    setEditedNote({ ...editedNote, content: newContent });
    setListType('bullet');
  };

  const startNumberList = () => {
    const newContent = editedNote.content + (editedNote.content && !editedNote.content.endsWith('\n') ? '\n' : '') + '1. ';
    setEditedNote({ ...editedNote, content: newContent });
    setListType('number');
    setNumberCounter(2);
  };

  return (
    <div className="edit-note-overlay">
      <div className="edit-note-modal">
        <form onSubmit={handleSubmit}>
          <div className="edit-note-header">
            <input
              type="text"
              placeholder="Title"
              value={editedNote.title}
              onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
              className="edit-note-title"
            />
            <button 
              type="button" 
              className="close-button"
              onClick={onClose}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="edit-note-content">
            <textarea
              placeholder="Take a note..."
              value={editedNote.content}
              onChange={(e) => setEditedNote({ ...editedNote, content: e.target.value })}
              onKeyDown={handleKeyDown}
              className="edit-note-textarea"
              autoFocus
            />
          </div>

          <div className="edit-note-footer">
            <div className="note-tools">
              <button 
                type="button" 
                className={`tool-button ${listType === 'bullet' ? 'active' : ''}`}
                onClick={startBulletList}
                title="Add bullet list"
              >
                <span className="material-icons">format_list_bulleted</span>
              </button>
              <button 
                type="button" 
                className={`tool-button ${listType === 'number' ? 'active' : ''}`}
                onClick={startNumberList}
                title="Add number list"
              >
                <span className="material-icons">format_list_numbered</span>
              </button>
              <button 
                type="button" 
                className="tool-button"
                onClick={() => setEditedNote({ ...editedNote, content: editedNote.content + '[ ] ' })}
                title="Add checkbox"
              >
                <span className="material-icons">check_box_outline_blank</span>
              </button>
            </div>
            <div className="edit-actions">
              <button type="submit" className="save-button">
                <span className="material-icons">save</span>
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNote;