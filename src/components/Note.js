// src/components/Note.js
import React from 'react';
import '../styles/Note.css';
import { auth } from '../firebase/firebase';
import { toast } from 'react-hot-toast';

const Note = ({ note, onEdit, deleteNote, onPinNote, isOffline }) => {
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (isOffline) {
      toast.error('Sign in to pin notes');
      return;
    }
    onPinNote(note.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (isOffline) {
      const cachedNotes = JSON.parse(localStorage.getItem('cachedNotes') || '[]');
      const updatedNotes = cachedNotes.filter(n => n.id !== note.id);
      localStorage.setItem('cachedNotes', JSON.stringify(updatedNotes));
      deleteNote(note.id);
      toast.success('Note deleted from local storage');
    } else {
      deleteNote(note.id);
    }
  };

  const handleEdit = () => {
    if (isOffline) {
      toast.error('Sign in to edit notes');
      return;
    }
    onEdit(note);
  };

  const formatTextForDisplay = (text) => {
    let formattedText = text;
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/__(.*?)__/g, '<u>$1</u>');
    formattedText = formattedText.replace(/~~(.*?)~~/g, '<span style="text-decoration: line-through;">$1</span>');
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<code>$1</code>');
    return formattedText;
  };

  const getPreviewContent = (content) => {
    const lines = content.split('\n');
    const previewLines = lines.slice(0, 4);
    while (previewLines.length < 4) {
      previewLines.push('');
    }
    return previewLines.join('\n');
  };

  return (
    <div 
      className={`note ${note.pinned === 'pinned' ? 'pinned' : ''} ${isOffline ? 'offline' : ''}`}
      onClick={handleEdit}
      role="button"
      tabIndex={0}
    >
      <div className="note-header">
        {note.title && <h3 className="note-title-bold">{note.title}</h3>}
      </div>
      <div className="note-content">
        <p 
          className="preview"
          dangerouslySetInnerHTML={{ 
            __html: formatTextForDisplay(getPreviewContent(note.content)) 
          }}
        />
      </div>
      <div className="note-footer">
        <span className="note-date">
          {formatDate(note.createdAt)}
          {isOffline && <span className="offline-indicator">offline</span>}
        </span>
        <div className="note-actions">
          <button 
            className={`pin-button ${note.pinned === 'pinned' ? 'pinned' : ''}`}
            onClick={handlePinClick}
            title={isOffline ? "Sign in to pin notes" : note.pinned === 'pinned' ? "Unpin note" : "Pin note"}
            disabled={isOffline}
          >
            <span className="material-icons">push_pin</span>
          </button>
          <button 
            className="action-button"
            onClick={handleDelete}
            title="Delete note"
          >
            <span className="material-icons">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Note;