// src/components/CreateNote.js
import React, { useState, useEffect } from 'react';
import '../styles/CreateNote.css';
import { auth, database } from '../firebase/firebase';
import { ref, set, push, get } from 'firebase/database';
import { toast } from 'react-hot-toast';



const formatDateTime = (date) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const padZero = (num) => num.toString().padStart(2, '0');

  const month = months[date.getMonth()];
  const day = padZero(date.getDate());
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = padZero(date.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = padZero(hours % 12 || 12);

  return `${month} ${day}, ${year}, ${formattedHours}:${minutes} ${ampm}`;
};






const CreateNote = ({ addNote, editingNote, onSave, onCancel }) => {
  const [note, setNote] = useState({
    title: '',
    content: ''
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [listType, setListType] = useState(null);
  const [numberCounter, setNumberCounter] = useState(1);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [isStrikethroughActive, setIsStrikethroughActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [cachedNotes, setCachedNotes] = useState(() => {
    const saved = localStorage.getItem('cachedNotes');
    return saved ? JSON.parse(saved) : [];
  });
  const handleExpand = () => {
    if (!isExpanded && !editingNote) {
      setIsAnimating(true);
      setIsExpanded(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Load cached notes from localStorage
        const cachedNotesString = localStorage.getItem('cachedNotes');
        if (cachedNotesString) {
          try {
            const cachedNotes = JSON.parse(cachedNotesString);
            if (cachedNotes.length > 0) {
              // Upload cached notes to Firebase
              const notesRef = ref(database, `users/${user.uid}/notes`);
              const snapshot = await get(notesRef);
              const existingNotes = snapshot.val() || {};

              for (const note of cachedNotes) {
                // Check if note already exists in Firebase (using timestamp as unique identifier)
                const noteExists = Object.values(existingNotes).some(
                  fbNote => fbNote.timestamp === note.timestamp
                );

                if (!noteExists) {
                  // Add user info to the note
                  const enrichedNote = {
                    ...note,
                    userId: user.uid,
                    userEmail: user.email,
                    author: user.displayName || user.email,
                    syncedFromCache: true
                  };

                  // Create new note reference and save
                  const newNoteRef = push(notesRef);
                  await set(newNoteRef, {
                    ...enrichedNote,
                    id: newNoteRef.key
                  });
                }
              }

              // Clear cached notes after successful sync
              localStorage.setItem('cachedNotes', JSON.stringify([]));
              toast.success('Local notes synced to your account');
            }
          } catch (error) {
            console.error('Error syncing cached notes:', error);
            toast.error('Failed to sync local notes');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []); // Empty dependency array since we only want this to run once on mount

  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(note.content.length);
  }, [note.content]);

  useEffect(() => {
    const textarea = document.querySelector('.note-textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [note.content]);
  // Initialize note when editing
  useEffect(() => {
    if (editingNote) {
      setNote(editingNote);
      setIsExpanded(true);
      updateListState(editingNote.content);
    } else {
      // Clear the form when not editing
      setNote({ title: '', content: '' });
      setIsExpanded(false);
      setListType(null);
      setNumberCounter(1);
    }
  }, [editingNote]);

  const updateListState = (content) => {
    const lines = content.split('\n');
    const hasBulletPoint = lines.some(line => line.trim().startsWith('• '));
    const hasNumberPoint = lines.some(line => /^\d+\.\s/.test(line.trim()));

    if (hasBulletPoint) {
      setListType('bullet');
    } else if (hasNumberPoint) {
      setListType('number');
      // Find the highest number to set the counter
      const numbers = lines
        .map(line => {
          const match = line.match(/^(\d+)\./);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      if (numbers.length > 0) {
        setNumberCounter(Math.max(...numbers) + 1);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const clipboard = e.clipboardData;
    const pastedData = clipboard.getData('text/html') || clipboard.getData('text/plain');
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Parse HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(pastedData, 'text/html');

    const processNode = (node, prefix = '') => {
      let result = '';
      
      if (node.nodeType === Node.TEXT_NODE) {
        return prefix + node.textContent;
      }

      const children = Array.from(node.childNodes);
      
      switch (node.nodeName.toLowerCase()) {
        case 'ul':
          children.forEach(child => {
            if (child.nodeName.toLowerCase() === 'li') {
              result += processNode(child, '• ');
            }
          });
          break;
        case 'ol':
          let counter = 1;
          children.forEach(child => {
            if (child.nodeName.toLowerCase() === 'li') {
              result += processNode(child, `${counter}. `);
              counter++;
            }
          });
          break;
        case 'li':
          result = prefix + children.map(child => processNode(child)).join('') + '\n';
          break;
        case 'b':
        case 'strong':
          result = `**${children.map(child => processNode(child)).join('')}**`;
          break;
        case 'u':
          result = `__${children.map(child => processNode(child)).join('')}__`;
          break;
        case 's':
        case 'strike':
          result = `~~${children.map(child => processNode(child)).join('')}~~`;
          break;
        case 'p':
          result = children.map(child => processNode(child)).join('') + '\n';
          break;
        default:
          result = children.map(child => processNode(child)).join('');
      }
      
      return result;
    };

    let processedContent = processNode(doc.body).trim();
    
    // If no HTML formatting was detected, use plain text
    if (!processedContent || processedContent === doc.body.textContent.trim()) {
      processedContent = clipboard.getData('text/plain');
    }

    const newContent = 
      note.content.substring(0, start) + 
      processedContent + 
      note.content.substring(end);

    setNote({ ...note, content: newContent });
  };

  const checkUnderlinePosition = (content, cursorPosition) => {
    const segments = content.split(/(__.*?__)/g);
    let position = 0;

    for (let segment of segments) {
      if (segment.startsWith('__') && segment.endsWith('__')) {
        if (cursorPosition > position + 2 && cursorPosition < position + segment.length - 1) {
          return true;
        }
      }
      position += segment.length;
    }
    return false;
  };

  const checkStrikethroughPosition = (content, cursorPosition) => {
    const segments = content.split(/(~~.*?~~)/g);
    let position = 0;

    for (let segment of segments) {
      if (segment.startsWith('~~') && segment.endsWith('~~')) {
        if (cursorPosition > position + 2 && cursorPosition < position + segment.length - 1) {
          return true;
        }
      }
      position += segment.length;
    }
    return false;
  };

  const processContent = (content) => {
    // For storing in backend
    let markdownContent = content;

    // Check for code blocks
    if (checkForCodeBlock(content.trim())) {
      markdownContent = `<code>${content.trim().slice(3, -3)}</code>`;
    }

    // For display
    const displayContent = markdownContent.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1);



    return { markdownContent, displayContent };
  };

  const checkBoldPosition = (content, cursorPosition) => {
    const segments = content.split(/(\*\*.*?\*\*)/g);
    let position = 0;

    for (let segment of segments) {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        if (cursorPosition > position + 2 && cursorPosition < position + segment.length - 1) {
          return true;
        }
      }
      position += segment.length;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (note.title.trim() || note.content.trim()) {
      const currentTime = new Date();
      const formattedTime = formatDateTime(currentTime);
      const { markdownContent } = processContent(note.content);

      const noteData = {
        title: note.title.trim(),
        content: markdownContent,
        createdAt: formattedTime,
        pinned: 'unpinned',
        timestamp: currentTime.getTime(),
        lastModified: formattedTime,
        id: editingNote ? editingNote.id : Date.now().toString()
      };

      try {
        if (auth.currentUser) {
          // Add user-specific data for Firebase
          noteData.userId = auth.currentUser.uid;
          noteData.userEmail = auth.currentUser.email;
          noteData.author = auth.currentUser.displayName || auth.currentUser.email;

          // Save to Firebase
          const notesRef = ref(database, `users/${auth.currentUser.uid}/notes`);
          const newNoteRef = push(notesRef);
          await set(newNoteRef, {
            ...noteData,
            id: newNoteRef.key // Use Firebase-generated key
          });

          addNote({ ...noteData, id: newNoteRef.key });
          toast.success('Note saved successfully');
        } else {
          // Existing local storage logic
          const existingNotes = JSON.parse(localStorage.getItem('cachedNotes') || '[]');
          const updatedNotes = [noteData, ...existingNotes];
          localStorage.setItem('cachedNotes', JSON.stringify(updatedNotes));
          addNote(noteData);

          window.dispatchEvent(new CustomEvent('notesUpdated', {
            detail: updatedNotes
          }));

          toast.success('Note saved to local storage');
        }

        // Clear form after submission
        setNote({ title: '', content: '' });
        setIsExpanded(false);
        setListType(null);
        setNumberCounter(1);
      } catch (error) {
        console.error('Error saving note:', error);
        toast.error(auth.currentUser
          ? 'Failed to save note. Please try again.'
          : 'Failed to save note to local storage.'
        );
      }
    }
  };


  const handleCancel = () => {
    // Clear everything when canceling
    setNote({ title: '', content: '' });
    setIsExpanded(false);
    setListType(null);
    setNumberCounter(1);
    if (onCancel) {
      onCancel();
    }
  };

  const toggleListType = (type) => {
    const textarea = document.querySelector('.note-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const fullContent = note.content;
    
    let lineStart = start;
    while (lineStart > 0 && fullContent[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    let lineEnd = end;
    while (lineEnd < fullContent.length && fullContent[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    const selectedLines = fullContent.substring(lineStart, lineEnd).split('\n');
    const isRemoving = selectedLines.every(line => {
      if (type === 'bullet') {
        return line.trim().startsWith('• ');
      } else {
        return /^\d+\.\s/.test(line.trim());
      }
    });
  
    let counter = 1;
    const processedLines = selectedLines.map(line => {
      const trimmedLine = line.trim();
      const indent = '   '; // Three spaces for indentation
      
      // Remove existing list markers
      let cleanLine = trimmedLine
        .replace(/^•\s+/, '')
        .replace(/^\d+\.\s+/, '');
      
      if (isRemoving) {
        return cleanLine;
      } else {
        if (type === 'bullet') {
          return `${indent}• ${cleanLine}`;
        } else {
          return `${indent}${counter++}. ${cleanLine}`;
        }
      }
    });
  
    const newContent =
      fullContent.substring(0, lineStart) +
      processedLines.join('\n') +
      fullContent.substring(lineEnd);
  
    setNote({ ...note, content: newContent });
    
    if (!isRemoving) {
      setListType(type);
      if (type === 'number') {
        setNumberCounter(2); // Set to 2 as the next number to be used
      }
    } else {
      setListType(null);
      setNumberCounter(1);
    }
  
    setTimeout(() => {
      textarea.focus();
      const newStart = lineStart;
      const newEnd = lineStart + processedLines.join('\n').length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      const content = note.content;
      const lines = content.split('\n');
      let currentLineStart = cursorPos;
      
      // Find start of current line
      while (currentLineStart > 0 && content[currentLineStart - 1] !== '\n') {
        currentLineStart--;
      }
      
      const currentLine = content.substring(currentLineStart, cursorPos);
      const bulletMatch = currentLine.match(/^(\s*)?•\s+(.*)/);
      const numberMatch = currentLine.match(/^(\s*)?(\d+)\.\s+(.*)/);
      
      if (bulletMatch || numberMatch) {
        const indent = '   '; // Three spaces
        const currentContent = bulletMatch ? 
          bulletMatch[2] : 
          numberMatch[3];
        
        if (!currentContent.trim()) {
          // Empty list item - remove the list marker
          const newContent = 
            content.substring(0, currentLineStart) +
            content.substring(cursorPos);
          setNote({ ...note, content: newContent });
          setListType(null);
          setNumberCounter(1);
        } else {
          // Continue list with new item
          let newLine;
          if (bulletMatch) {
            newLine = `\n${indent}• `;
          } else {
            const currentNumber = parseInt(numberMatch[2], 10);
            newLine = `\n${indent}${currentNumber + 1}. `;
            setNumberCounter(currentNumber + 2);
          }
          
          const newContent =
            content.substring(0, cursorPos) +
            newLine +
            content.substring(cursorPos);
          
          setNote({ ...note, content: newContent });
          
          // Set cursor position after the new list marker
          setTimeout(() => {
            const newPos = cursorPos + newLine.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
      } else {
        // If not in a list, just add a normal newline
        const newContent = 
          content.substring(0, cursorPos) +
          '\n' +
          content.substring(cursorPos);
        
        setNote({ ...note, content: newContent });
        
        setTimeout(() => {
          const newPos = cursorPos + 1;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      }
    } else if (e.key === 'Tab') {
      // ... existing tab handling code ...
    }
  };


  const checkCurrentFormatting = (position) => {
    const textarea = document.querySelector('.note-textarea');
    const currentPos = position ?? textarea.selectionStart;
    const content = note.content;
    const lines = content.split('\n');
  
    let charCount = 0;
    let currentLine = '';
  
    // Find the current line
    for (const line of lines) {
      if (currentPos >= charCount && currentPos <= charCount + line.length) {
        currentLine = line;
        break;
      }
      charCount += line.length + 1;
    }
  
    // Update list type based on current line
    const detectedListType = detectListType(currentLine);
    if (detectedListType !== listType) {
      setListType(detectedListType);
      if (detectedListType === 'number') {
        const match = currentLine.match(/^(\s*)?(\d+)\./);
        if (match) {
          const currentNumber = parseInt(match[2], 10);
          setNumberCounter(currentNumber + 1);
        }
      }
    }
  };

  const insertFormatting = (format) => {
    const textarea = document.querySelector('.note-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = note.content.substring(start, end);
    let newText = note.content;

    if (format === 'code') {
      const codeMarker = '```';
      newText = note.content.substring(0, start) +
        `${codeMarker}\n${selectedText}\n${codeMarker}` +
        note.content.substring(end);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + codeMarker.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else if (format === 'bold' || format === 'underline' || format === 'strikethrough') {
      const marker = format === 'bold' ? '\\*\\*' :
        format === 'underline' ? '__' : '~~';
      const segments = note.content.split(new RegExp(`(${marker}.*?${marker})`, 'g'));
      let position = 0;
      let isInFormattedSection = false;

      for (let segment of segments) {
        const isFormatted = (format === 'bold' && segment.startsWith('**') && segment.endsWith('**')) ||
          (format === 'underline' && segment.startsWith('__') && segment.endsWith('__')) ||
          (format === 'strikethrough' && segment.startsWith('~~') && segment.endsWith('~~'));

        if (isFormatted && start >= position + 2 && start <= position + segment.length - 2) {
          isInFormattedSection = true;
          break;
        }
        position += segment.length;
      }

      if (isInFormattedSection) {
        newText = note.content.substring(0, start - 2) + selectedText + note.content.substring(end + 2);
        if (format === 'bold') setIsBoldActive(false);
        else if (format === 'underline') setIsUnderlineActive(false);
        else setIsStrikethroughActive(false);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 2, start - 2);
        }, 0);
      } else {
        const formatMarker = format === 'bold' ? '**' :
          format === 'underline' ? '__' : '~~';
        newText = note.content.substring(0, start) +
          `${formatMarker}${selectedText}${formatMarker}` +
          note.content.substring(end);
        
        if (format === 'bold') setIsBoldActive(true);
        else if (format === 'underline') setIsUnderlineActive(true);
        else setIsStrikethroughActive(true);

        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    }

    setNote({ ...note, content: newText });
  };

  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      // Only handle shortcuts when editor is focused
      const isEditorFocused = document.activeElement.classList.contains('note-textarea');
      if (!isEditorFocused) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            insertFormatting('bold');
            break;
          case 'u':
            e.preventDefault();
            insertFormatting('underline');
            break;
          case 'l':
            e.preventDefault();
            insertFormatting('strikethrough');
            break;
          case 'p':
            e.preventDefault();
            toggleListType('bullet');
            break;
          case 'n':
            e.preventDefault();
            toggleListType('number');
            break;
          case 's':
            e.preventDefault();
            handleSubmit(new Event('submit'));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [note, insertFormatting, toggleListType, handleSubmit]);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Check if we're entering or leaving a code block
    if (newContent.includes('```')) {
      const blocks = newContent.split('```');
      if (blocks.length % 2 === 0) {
        // We're inside a code block
        const beforeCursor = newContent.substring(0, cursorPos);
        const afterCursor = newContent.substring(cursorPos);

        if (!beforeCursor.endsWith('\n')) {
          const updatedContent = beforeCursor + '\n' + afterCursor;
          setNote({ ...note, content: updatedContent });
          return;
        }
      }
    }

    setNote({ ...note, content: newContent });
    checkCurrentFormatting(cursorPos);
  };



  const handleKeyUp = (e) => {
    checkCurrentFormatting();
  };

  const detectListType = (line) => {
    if (line.trim().startsWith('• ')) {
      return 'bullet';
    } else if (/^\d+\.\s/.test(line.trim())) {
      return 'number';
    }
    return null;
  };

  const handleSelectionChange = (e) => {
    const textarea = e.target;
    const cursorPosition = textarea.selectionStart;
    const isInBold = checkBoldPosition(note.content, cursorPosition);
    const isInUnderline = checkUnderlinePosition(note.content, cursorPosition);
    const isInStrikethrough = checkStrikethroughPosition(note.content, cursorPosition);
    setIsBoldActive(isInBold);
    setIsUnderlineActive(isInUnderline);
    setIsStrikethroughActive(isInStrikethrough);
  };

  // Function to format text for display
  // const formatTextForDisplay = (text) => {
  //   return text.replace(/\*\*(.*?)\*\*/g, '$1');
  // };

  const checkForCodeBlock = (content) => {
    // Check if the text starts and ends with triple backticks
    if (content.startsWith('```') && content.endsWith('```')) {
      return true;
    }
    return false;
  };


  // const startBulletList = () => {
  //   const newContent = note.content + (note.content && !note.content.endsWith('\n') ? '\n' : '') + '• ';
  //   setNote({ ...note, content: newContent });
  //   setListType('bullet');
  // };

  // const startNumberList = () => {
  //   const newContent = note.content + (note.content && !note.content.endsWith('\n') ? '\n' : '') + '1. ';
  //   setNote({ ...note, content: newContent });
  //   setListType('number');
  //   setNumberCounter(2);
  // };

  return (
    <div
      className={`create-note ${isExpanded || editingNote ? 'expanded' : ''} 
                 ${isAnimating ? 'animating' : ''}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="note-header">
          {(isExpanded || editingNote) && (
            <input
              type="text"
              placeholder="Title"
              value={note.title}
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              className="note-title"
              autoFocus
            />
          )}
        </div>

        <div className="note-content" onClick={handleExpand}>
        <textarea
            placeholder="Take a note..."
            value={note.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onSelect={handleSelectionChange}
            onPaste={handlePaste}
            className="note-textarea"
            rows={isExpanded || editingNote ? 8 : 1}
          />
          {(isExpanded || editingNote) && (
            <div className="char-count">{charCount} characters</div>
          )}
        </div>

        {(isExpanded || editingNote) && (
          <div className="note-footer">
            <div className="note-tools">
              <button
                type="button"
                className={`tool-button ${isBoldActive ? 'active' : ''}`}
                onClick={() => insertFormatting('bold')}
                title="Bold (Ctrl+B)"
              >
                <span className="material-icons">format_bold</span>
              </button>
              <button
                type="button"
                className={`tool-button ${isUnderlineActive ? 'active' : ''}`}
                onClick={() => insertFormatting('underline')}
                title="Underline (Ctrl+U)"
              >
                <span className="material-icons">format_underlined</span>
              </button>
              <button
                type="button"
                className={`tool-button ${isStrikethroughActive ? 'active' : ''}`}
                onClick={() => insertFormatting('strikethrough')}
                title="Strikethrough (Ctrl+L)"
              >
                <span className="material-icons">strikethrough_s</span>
              </button>
              <button
                type="button"
                className={`tool-button ${listType === 'bullet' ? 'active' : ''}`}
                onClick={() => toggleListType('bullet')}
                title="Bullet List (Ctrl+P)"
              >
                <span className="material-icons">format_list_bulleted</span>
              </button>
              <button
                type="button"
                className={`tool-button ${listType === 'number' ? 'active' : ''}`}
                onClick={() => toggleListType('number')}
                title="Number List (Ctrl+N)"
              >
                <span className="material-icons">format_list_numbered</span>
              </button>
              <button
                type="button"
                className="tool-button"
                onClick={() => insertFormatting('code')}
                title="Code Block"
              >
                <span className="material-icons">code</span>
              </button>
            </div>
            <div className="note-actions">
              {editingNote && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="save-button">
                <span className="material-icons">save</span>
                {editingNote ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CreateNote;