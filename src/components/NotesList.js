// src/components/NotesList.js
import React, { useState, useEffect } from 'react';
import Note from './Note';
import '../styles/NotesList.css';
import { auth, database } from '../firebase/firebase';
import { ref, onValue } from 'firebase/database';
import { toast } from 'react-hot-toast';

const NotesList = ({ deleteNote, onEditNote, onPinNote, searchQuery }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        const loadCachedNotes = () => {
          try {
            const cachedNotes = JSON.parse(localStorage.getItem('cachedNotes') || '[]');
            setNotes(cachedNotes);
            setLoading(false);
          } catch (error) {
            console.error('Error loading cached notes:', error);
            setNotes([]);
            setLoading(false);
          }
        };
  
        // Initial load
        loadCachedNotes();
  
        // Listen for updates
        const handleNotesUpdate = (event) => {
          setNotes(event.detail);
        };
  
        window.addEventListener('notesUpdated', handleNotesUpdate);
        return () => window.removeEventListener('notesUpdated', handleNotesUpdate);
      }
      if (user) {
        // User is logged in - fetch from Firebase
        const notesRef = ref(database, `users/${user.uid}/notes`);
        onValue(notesRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const notesList = Object.entries(data).map(([id, note]) => ({
              ...note,
              id
            }));
            
            // Sort notes by timestamp to maintain order
            notesList.sort((a, b) => b.timestamp - a.timestamp);
            
            setNotes(notesList);
            
            // Update cache with the latest data from Firebase
            localStorage.setItem('cachedNotes', JSON.stringify([])); // Clear old cache
          } else {
            setNotes([]);
            localStorage.setItem('cachedNotes', JSON.stringify([]));
          }
          setLoading(false);
        }, (error) => {
          console.error('Error fetching notes:', error);
          toast.error('Failed to fetch notes');
          loadFromCache();
        });
      } else {
        // User is not logged in - load from cache
        loadFromCache();
        
        // Set up localStorage event listener for offline mode
        const handleStorageChange = () => {
          const cachedNotes = JSON.parse(localStorage.getItem('cachedNotes') || '[]');
          setNotes(cachedNotes);
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('notesUpdated', (event) => {
          setNotes(event.detail);
        });
        
        return () => {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('notesUpdated', handleStorageChange);
        };
      }
    });
  
    return () => unsubscribe();
  }, []);

  // const getCurrentUTCTimestamp = () => {
  //   const now = new Date();
  //   return now.toISOString();
  // };

  const loadFromCache = () => {
    try {
      const cachedNotesString = localStorage.getItem('cachedNotes');
      const cachedNotes = cachedNotesString ? JSON.parse(cachedNotesString) : [];
      setNotes(cachedNotes);
      setLoading(false);

      if (!auth.currentUser) {
        toast.success('Loaded notes from local storage');
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
      setNotes([]);
      setLoading(false);
      toast.error('Failed to load cached notes');
    }
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title?.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    );
  });

  // Sort notes by timestamp in descending order within their pinned/unpinned groups
  const sortNotes = (notesToSort) => {
    return notesToSort.sort((a, b) => {
      if (a.pinned === 'pinned' && b.pinned !== 'pinned') return -1;
      if (a.pinned !== 'pinned' && b.pinned === 'pinned') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  const pinnedNotes = sortNotes(filteredNotes.filter(note => note.pinned === 'pinned'));
  const unpinnedNotes = sortNotes(filteredNotes.filter(note => note.pinned !== 'pinned'));

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading notes...</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="empty-notes">
        <div className="empty-notes-content">
          <span className="material-icons empty-icon">note_add</span>
          <p>No notes yet</p>
          <p className="empty-subtitle">
            {auth.currentUser 
              ? "Click the box above to create your first note"
              : "Sign in to create and sync your notes"}
          </p>
        </div>
      </div>
    );
  }

  if (filteredNotes.length === 0 && searchQuery) {
    return (
      <div className="no-results">
        <div className="no-results-content">
          <span className="material-icons">search_off</span>
          <p>No results found for "{searchQuery}"</p>
          <p className="no-results-subtitle">Try searching with different keywords</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-list">
      {!auth.currentUser && notes.length > 0 && (
        <div className="offline-banner">
          <span className="material-icons">cloud_off</span>
          <p>You're viewing cached notes. Sign in to sync and save changes.</p>
        </div>
      )}

      {pinnedNotes.length > 0 && (
        <div className="notes-section">
          <div className="section-header">
            <span className="material-icons">push_pin</span>
            <h2>Pinned Notes</h2>
          </div>
          <div className="notes-grid">
            {pinnedNotes.map(note => (
              <Note
                key={note.id}
                note={note}
                deleteNote={deleteNote}
                onEdit={onEditNote}
                onPinNote={onPinNote}
                isOffline={!auth.currentUser}
              />
            ))}
          </div>
        </div>
      )}
      
      {unpinnedNotes.length > 0 && (
        <div className="notes-section">
          <div className="section-header">
            <h2>My Notes</h2>
          </div>
          <div className="notes-grid">
            {unpinnedNotes.map(note => (
              <Note
                key={note.id}
                note={note}
                deleteNote={deleteNote}
                onEdit={onEditNote}
                onPinNote={onPinNote}
                isOffline={!auth.currentUser}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesList;