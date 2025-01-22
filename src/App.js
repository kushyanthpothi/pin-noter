// src/App.js
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import CreateNote from './components/CreateNote';
import Footer from './components/Footer';
import NotesList from './components/NotesList';
import { Toaster, toast } from 'react-hot-toast';
import { auth, database } from './firebase/firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import './App.css';

function App() {
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch notes from Firebase when user auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const notesRef = ref(database, `users/${user.uid}/notes`);
        onValue(notesRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const notesList = Object.entries(data).map(([id, note]) => ({
              ...note,
              id,
            }));
            setNotes(notesList);
          } else {
            setNotes([]);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error fetching notes:', error);
          toast.error('Failed to fetch notes');
        });
      } else {
        setNotes([]);
        setLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, []);
  

  const addNote = (newNote) => {
    setNotes([newNote, ...notes]);
  };

  const deleteNote = async (id) => {
    if (!auth.currentUser) {
      toast.error('Please sign in to delete notes');
      return;
    }

    try {
      await remove(ref(database, `users/${auth.currentUser.uid}/notes/${id}`));
      setNotes(notes.filter(note => note.id !== id));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleEditNote = (note) => {
    if (!auth.currentUser) {
      toast.error('Please sign in to edit notes');
      return;
    }
    setEditingNote(note);
  };

  const handlePinNote = async (id) => {
    if (!auth.currentUser) {
      toast.error('Please sign in to pin notes');
      return;
    }

    try {
      const noteToUpdate = notes.find(note => note.id === id);
      const newPinState = noteToUpdate.pinned === 'pinned' ? 'unpinned' : 'pinned';
      
      await update(ref(database, `users/${auth.currentUser.uid}/notes/${id}`), {
        pinned: newPinState
      });

      setNotes(notes.map(note =>
        note.id === id ? { ...note, pinned: newPinState } : note
      ));

      toast.success(newPinState === 'pinned' ? 'Note pinned' : 'Note unpinned');
    } catch (error) {
      console.error('Error updating pin status:', error);
      toast.error('Failed to update pin status');
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query.toLowerCase());
  };

  const filteredNotes = notes.filter(note => {
    const lowercaseQuery = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.content.toLowerCase().includes(lowercaseQuery)
    );
  });

  const handleSaveEdit = async (editedNote) => {
    if (!auth.currentUser) {
      toast.error('Please sign in to save changes');
      return;
    }
  
    try {
      await update(ref(database, `users/${auth.currentUser.uid}/notes/${editedNote.id}`), editedNote);
      
      // Immediately update the notes state with the edited note
      setNotes((prevNotes) =>
        prevNotes.map((note) => (note.id === editedNote.id ? editedNote : note))
      );
  
      setEditingNote(null);
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };
  

  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="app">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--note-border)',
                borderRadius: '8px',
                padding: '12px 16px',
              },
              success: {
                style: {
                  borderLeft: '4px solid #4CAF50',
                },
                iconTheme: {
                  primary: '#4CAF50',
                  secondary: '#fff',
                },
              },
              error: {
                style: {
                  borderLeft: '4px solid #f44336',
                },
                iconTheme: {
                  primary: '#f44336',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Header onSearch={handleSearch} />
          <main className="main-content">
            {loading ? (
              <div className="loading">Loading notes...</div>
            ) : (
              <>
                {editingNote ? (
                  <CreateNote
                    editingNote={editingNote}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingNote(null)}
                  />
                ) : (
                  <CreateNote addNote={addNote} />
                )}
                <NotesList
                  notes={filteredNotes.sort((a, b) => {
                    if (a.pinned === 'pinned' && b.pinned !== 'pinned') return -1;
                    if (a.pinned !== 'pinned' && b.pinned === 'pinned') return 1;
                    return b.timestamp - a.timestamp;
                  })}
                  deleteNote={deleteNote}
                  onEditNote={handleEditNote}
                  onPinNote={handlePinNote}
                  searchQuery={searchQuery}
                />
              </>
            )}
          </main>
          <Footer />git remote add origin https://github.com/kushyanthpothi/pin-noter.git
git branch -M main
git push -u origin main
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;