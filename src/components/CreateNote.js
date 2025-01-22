// src/components/CreateNote.js
import React, { useState, useEffect } from 'react';
import '../styles/CreateNote.css';
import { auth, database } from '../firebase/firebase';
import { ref, set, push,get } from 'firebase/database';
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
      if (user && cachedNotes.length > 0) {
        // Upload cached notes to Firebase
        try {
          const notesRef = ref(database, `users/${user.uid}/notes`);
          const snapshot = await get(notesRef);
          const existingNotes = snapshot.val() || {};
  
          // Filter out notes that already exist in Firebase
          const newCachedNotes = cachedNotes.filter(note => 
            !Object.values(existingNotes).some(fbNote => 
              fbNote.timestamp === note.timestamp
            )
          );
  
          // Upload new cached notes
          for (const note of newCachedNotes) {
            const newNoteRef = push(notesRef);
            await set(newNoteRef, {
              ...note,
              id: newNoteRef.key,
              userId: user.uid,
              userEmail: user.email,
              author: user.displayName || user.email
            });
          }
  
          if (newCachedNotes.length > 0) {
            toast.success('Local notes synced to your account');
            // Clear cached notes after successful sync
            localStorage.setItem('cachedNotes', JSON.stringify([]));
            setCachedNotes([]);
          }
        } catch (error) {
          console.error('Error syncing cached notes:', error);
          toast.error('Failed to sync local notes');
        }
      }
    });
  
    return () => unsubscribe();
  }, [cachedNotes]);

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

  // const handleCodeFormatting = (e) => {
  //   const textarea = e.target;
  //   const start = textarea.selectionStart;
  //   const end = textarea.selectionEnd;
  //   const content = note.content;

  //   // Check if we're inside a code block
  //   const beforeCursor = content.substring(0, start);
  //   const afterCursor = content.substring(end);
  //   const codeBlockStart = beforeCursor.lastIndexOf('```');
  //   const codeBlockEnd = afterCursor.indexOf('```');

  //   if (codeBlockStart !== -1 && codeBlockEnd !== -1) {
  //     // We're inside a code block
  //     if (e.key === 'Enter') {
  //       e.preventDefault();
  //       // Add newline with proper indentation
  //       const lines = beforeCursor.split('\n');
  //       const currentLine = lines[lines.length - 1];
  //       const indentation = currentLine.match(/^\s*/)[0];

  //       const newContent = beforeCursor + '\n' + indentation + afterCursor;
  //       setNote({ ...note, content: newContent });

  //       // Set cursor position after indentation
  //       setTimeout(() => {
  //         const newPosition = start + 1 + indentation.length;
  //         textarea.setSelectionRange(newPosition, newPosition);
  //       }, 0);
  //     }
  //   }
  // };



  // const isNumberedListInSequence = (lines, startIndex) => {
  //   let expectedNumber = 1;
  //   let currentIndex = startIndex;

  //   // Go backwards to find the start of the list
  //   while (currentIndex >= 0) {
  //     const match = lines[currentIndex].match(/^(\d+)\./);
  //     if (!match) break;
  //     expectedNumber = parseInt(match[1], 10);
  //     currentIndex--;
  //   }

  //   // Go forwards to check sequence
  //   currentIndex = startIndex;
  //   while (currentIndex < lines.length) {
  //     const match = lines[currentIndex].match(/^(\d+)\./);
  //     if (!match) break;

  //     const currentNumber = parseInt(match[1], 10);
  //     if (currentNumber !== expectedNumber) {
  //       return false;
  //     }
  //     expectedNumber++;
  //     currentIndex++;
  //   }

  //   return true;
  // };

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

  // const handlePaste = (e) => {
  //   e.preventDefault();
  //   const clipboard = e.clipboardData || window.clipboardData;
  //   const pastedData = clipboard.getData('text');

  //   // Parse the pasted content for formatting
  //   const formattedContent = parseFormattedContent(pastedData);

  //   const start = e.target.selectionStart;
  //   const end = e.target.selectionEnd;
  //   const currentContent = note.content;

  //   // Insert formatted content at cursor position
  //   const newContent =
  //     currentContent.substring(0, start) +
  //     formattedContent +
  //     currentContent.substring(end);

  //   setNote({ ...note, content: newContent });

  //   // Update cursor position
  //   setTimeout(() => {
  //     const newPosition = start + formattedContent.length;
  //     e.target.setSelectionRange(newPosition, newPosition);
  //   }, 0);
  // };

  // const parseFormattedContent = (content) => {
  //   // Parse HTML formatting
  //   const tempDiv = document.createElement('div');
  //   tempDiv.innerHTML = content;

  //   let result = tempDiv.innerText;

  //   // Convert HTML formatting to markdown
  //   if (tempDiv.querySelector('strong, b')) result = result.replace(/<(strong|b)>(.*?)<\/\1>/g, '**$2**');
  //   if (tempDiv.querySelector('u')) result = result.replace(/<u>(.*?)<\/u>/g, '__$1__');
  //   if (tempDiv.querySelector('strike, s')) result = result.replace(/<(strike|s)>(.*?)<\/\1>/g, '~~$2~~');
  //   if (tempDiv.querySelector('code')) result = result.replace(/<code>(.*?)<\/code>/g, '```\n$1\n```');

  //   // Convert lists
  //   if (tempDiv.querySelector('ul')) {
  //     result = result.replace(/<ul>(.*?)<\/ul>/g, (match, content) => {
  //       return content.replace(/<li>(.*?)<\/li>/g, '• $1\n');
  //     });
  //   }
  //   if (tempDiv.querySelector('ol')) {
  //     let counter = 1;
  //     result = result.replace(/<ol>(.*?)<\/ol>/g, (match, content) => {
  //       return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1\n`);
  //     });
  //   }

  //   return result;
  // };

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
          // User is logged in - save to Firebase
          noteData.userId = auth.currentUser.uid;
          noteData.userEmail = auth.currentUser.email;
          noteData.author = auth.currentUser.displayName || auth.currentUser.email;
  
          if (editingNote) {
            // Update existing note
            await set(ref(database, `users/${auth.currentUser.uid}/notes/${editingNote.id}`), noteData);
            
            if (onSave) {
              onSave(noteData);
            }
            
            toast.success('Note updated successfully!');
          } else {
            // Create new note
            const newNoteRef = push(ref(database, `users/${auth.currentUser.uid}/notes`));
            const newNoteData = { ...noteData, id: newNoteRef.key };
            await set(newNoteRef, newNoteData);
            
            addNote(newNoteData);
            toast.success('Note saved successfully!');
          }
        } else {
          // User is not logged in - save to local storage
          if (editingNote) {
            // Update existing note in cache
            const updatedCachedNotes = cachedNotes.map(n => 
              n.id === editingNote.id ? noteData : n
            );
            localStorage.setItem('cachedNotes', JSON.stringify(updatedCachedNotes));
            setCachedNotes(updatedCachedNotes);
            
            if (onSave) {
              onSave(noteData);
            }
            
            toast.success('Note updated in local storage');
          } else {
            // Add new note to cache
            const updatedCachedNotes = [noteData, ...cachedNotes];
            localStorage.setItem('cachedNotes', JSON.stringify(updatedCachedNotes));
            setCachedNotes(updatedCachedNotes);
            
            addNote(noteData);
            toast.success('Note saved to local storage');
          }
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
    
    // Get the full content and selected text
    const fullContent = note.content;
    // const selectedText = fullContent.substring(start, end);
    
    // Find the start of the first line and end of the last line of selection
    let lineStart = start;
    while (lineStart > 0 && fullContent[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    let lineEnd = end;
    while (lineEnd < fullContent.length && fullContent[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    // Get all lines in selection
    const selectedLines = fullContent.substring(lineStart, lineEnd).split('\n');
    
    // Track if we're removing or adding list markers
    const isRemoving = selectedLines.every(line => {
      if (type === 'bullet') {
        return line.trim().startsWith('• ');
      } else {
        return /^\d+\.\s/.test(line.trim());
      }
    });
    
    // Process each line
    let counter = 1;
    const processedLines = selectedLines.map(line => {
      const trimmedLine = line.trim();
      const indent = line.match(/^\s*/)[0];
      
      // Remove existing list markers if present
      let cleanLine = trimmedLine
        .replace(/^• /, '')
        .replace(/^\d+\.\s/, '');
        
      if (isRemoving) {
        return indent + cleanLine;
      } else {
        if (type === 'bullet') {
          return indent + '• ' + cleanLine;
        } else {
          return indent + `${counter++}. ` + cleanLine;
        }
      }
    });
    
    // Combine everything back together
    const newContent = 
      fullContent.substring(0, lineStart) +
      processedLines.join('\n') +
      fullContent.substring(lineEnd);
    
    setNote({ ...note, content: newContent });
    
    // Update list state
    if (!isRemoving) {
      setListType(type);
      if (type === 'number') {
        setNumberCounter(counter);
      }
    } else {
      setListType(null);
      if (type === 'number') {
        setNumberCounter(1);
      }
    }
    
    // Restore selection
    setTimeout(() => {
      textarea.focus();
      const newStart = lineStart;
      const newEnd = lineStart + processedLines.join('\n').length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };


  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      
      // Handle multi-line indentation
      if (start !== end) {
        const selectedText = note.content.substring(start, end);
        const lines = selectedText.split('\n');
        const indentedLines = lines.map(line => '    ' + line);
        const newContent = 
          note.content.substring(0, start) +
          indentedLines.join('\n') +
          note.content.substring(end);
        
        setNote({ ...note, content: newContent });
        
        // Update selection
        setTimeout(() => {
          e.target.selectionStart = start;
          e.target.selectionEnd = start + indentedLines.join('\n').length;
        }, 0);
      } else {
        // Single line indentation (existing code)
        const newContent = 
          note.content.substring(0, start) +
          '    ' +
          note.content.substring(end);
        setNote({ ...note, content: newContent });
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = start + 4;
        }, 0);
      }
    } else if (e.key === 'Enter') {
      const cursorPos = e.target.selectionStart;
      const lines = note.content.split('\n');
      let currentPos = 0;
      let currentLineIndex = 0;

      // Find current line
      for (let i = 0; i < lines.length; i++) {
        if (cursorPos >= currentPos && cursorPos <= currentPos + lines[i].length) {
          currentLineIndex = i;
          break;
        }
        currentPos += lines[i].length + 1;
      }

      const currentLine = lines[currentLineIndex];
      const hasBullet = currentLine.trim().startsWith('• ');
      const hasNumber = /^\d+\.\s/.test(currentLine.trim());

      if (hasBullet || hasNumber) {
        e.preventDefault();
        const content = hasBullet
          ? currentLine.replace(/^(\s*)?• /, '')
          : currentLine.replace(/^(\s*)?\d+\.\s/, '');
        const indent = currentLine.match(/^(\s*)/)[0];

        if (!content.trim()) {
          // Empty list item - remove marker
          lines[currentLineIndex] = '';
          setListType(null);
        } else {
          // Continue list with new item
          if (hasBullet) {
            lines.splice(currentLineIndex + 1, 0, `${indent}• `);
          } else {
            const currentNumber = parseInt(currentLine.match(/^(\d+)\./)[1], 10);
            lines.splice(currentLineIndex + 1, 0, `${indent}${currentNumber + 1}. `);
            setNumberCounter(currentNumber + 2);
          }
        }

        const newContent = lines.join('\n');
        setNote({ ...note, content: newContent });

        setTimeout(() => {
          const newPos = currentPos + currentLine.length + 1 + indent.length +
            (hasBullet ? 2 : String(numberCounter).length + 2);
          e.target.selectionStart = e.target.selectionEnd = newPos;
        }, 0);
      }
    }
  };


  // const handleCursorMove = (e) => {
  //   const textarea = e.target;
  //   const cursorPos = textarea.selectionStart;
  //   checkCurrentFormatting(cursorPos);
  //   checkCurrentFormatting(e.target.selectionStart);
  // };

  // const toggleBulletList = () => {
  //   const textarea = document.querySelector('.note-textarea');
  //   const start = textarea.selectionStart;
  //   const lines = note.content.split('\n');
  //   let currentPos = 0;
  //   let currentLineIndex = 0;

  //   // Find current line
  //   for (let i = 0; i < lines.length; i++) {
  //     if (start >= currentPos && start <= currentPos + lines[i].length) {
  //       currentLineIndex = i;
  //       break;
  //     }
  //     currentPos += lines[i].length + 1;
  //   }

  //   const currentLine = lines[currentLineIndex];
  //   const hasBullet = currentLine.trim().startsWith('• ');

  //   if (hasBullet) {
  //     // Remove bullet
  //     lines[currentLineIndex] = currentLine.replace(/^(\s*)?• /, '$1');
  //     setListType(null);
  //   } else {
  //     // Add bullet
  //     const indent = currentLine.match(/^(\s*)/)[0];
  //     lines[currentLineIndex] = `${indent}• ${currentLine.trim()}`;
  //     setListType('bullet');
  //   }

  //   const newContent = lines.join('\n');
  //   setNote({ ...note, content: newContent });
  // };

  // const toggleNumberList = () => {
  //   const textarea = document.querySelector('.note-textarea');
  //   const start = textarea.selectionStart;
  //   const lines = note.content.split('\n');
  //   let currentPos = 0;
  //   let currentLineIndex = 0;

  //   // Find current line
  //   for (let i = 0; i < lines.length; i++) {
  //     if (start >= currentPos && start <= currentPos + lines[i].length) {
  //       currentLineIndex = i;
  //       break;
  //     }
  //     currentPos += lines[i].length + 1;
  //   }

  //   const currentLine = lines[currentLineIndex];
  //   const hasNumber = /^\s*\d+\.\s/.test(currentLine);

  //   if (hasNumber) {
  //     // Remove number
  //     lines[currentLineIndex] = currentLine.replace(/^(\s*)?\d+\.\s/, '$1');
  //     setListType(null);
  //     setNumberCounter(1);
  //   } else {
  //     // Add number
  //     const indent = currentLine.match(/^(\s*)/)[0];

  //     // Find the number to use
  //     let lastNumber = 0;
  //     for (let i = currentLineIndex - 1; i >= 0; i--) {
  //       const numberMatch = lines[i].match(/^(\s*)?(\d+)\.\s/);
  //       if (numberMatch) {
  //         lastNumber = parseInt(numberMatch[2], 10);
  //         break;
  //       }
  //     }

  //     lines[currentLineIndex] = `${indent}${lastNumber + 1}. ${currentLine.trim()}`;
  //     setListType('number');
  //     setNumberCounter(lastNumber + 2);
  //   }

  //   const newContent = lines.join('\n');
  //   setNote({ ...note, content: newContent });
  // };


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
        const match = currentLine.match(/^(\d+)\./);
        if (match) {
          setNumberCounter(parseInt(match[1], 10) + 1);
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
      // Handle code formatting
      const codeMarker = '```';
      newText = note.content.substring(0, start) +
        `${codeMarker}\n${selectedText}\n${codeMarker}` +
        note.content.substring(end);

      // Set cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + codeMarker.length + 1; // +1 for newline
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }

    else if (format === 'bold' || format === 'underline' || format === 'strikethrough') {
      // Escape special characters for regex
      const marker = format === 'bold' ? '\\*\\*' :
        format === 'underline' ? '__' :
          '~~';
      const segments = note.content.split(new RegExp(`(${marker}.*?${marker})`, 'g'));
      let position = 0;
      let isInFormattedSection = false;

      // Find if cursor is within a formatted section
      for (let segment of segments) {
        if ((format === 'bold' && segment.startsWith('**') && segment.endsWith('**')) ||
          (format === 'underline' && segment.startsWith('__') && segment.endsWith('__')) ||
          (format === 'strikethrough' && segment.startsWith('~~') && segment.endsWith('~~'))) {
          if (start >= position + 2 && start <= position + segment.length - 2) {
            isInFormattedSection = true;
            break;
          }
        }
        position += segment.length;
      }

      if (isInFormattedSection) {
        // Remove formatting only from selected text
        const beforeCursor = note.content.substring(0, start - 2);
        const afterCursor = note.content.substring(end + 2);
        newText = beforeCursor + selectedText + afterCursor;
        if (format === 'bold') setIsBoldActive(false);
        else if (format === 'underline') setIsUnderlineActive(false);
        else setIsStrikethroughActive(false);

        // Set cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 2, start - 2);
        }, 0);
      } else {
        // Add formatting to selected text
        const formatMarker = format === 'bold' ? '**' :
          format === 'underline' ? '__' :
            '~~';
        newText = note.content.substring(0, start) +
          `${formatMarker}${selectedText}${formatMarker}` +
          note.content.substring(end);
        if (format === 'bold') setIsBoldActive(true);
        else if (format === 'underline') setIsUnderlineActive(true);
        else setIsStrikethroughActive(true);

        // Set cursor position
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    }

    setNote({ ...note, content: newText });
  };

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
                title="Bold"
              >
                <span className="material-icons">format_bold</span>
              </button>
              <button
                type="button"
                className={`tool-button ${isUnderlineActive ? 'active' : ''}`}
                onClick={() => insertFormatting('underline')}
                title="Underline"
              >
                <span className="material-icons">format_underlined</span>
              </button>
              <button
                type="button"
                className={`tool-button ${isStrikethroughActive ? 'active' : ''}`}
                onClick={() => insertFormatting('strikethrough')}
                title="Strikethrough"
              >
                <span className="material-icons">strikethrough_s</span>
              </button>
              <button
                type="button"
                className={`tool-button ${listType === 'bullet' ? 'active' : ''}`}
                onClick={() => toggleListType('bullet')}
                title="Add bullet list"
              >
                <span className="material-icons">format_list_bulleted</span>
              </button>
              <button
                type="button"
                className={`tool-button ${listType === 'number' ? 'active' : ''}`}
                onClick={() => toggleListType('number')}
                title="Add number list"
              >
                <span className="material-icons">format_list_numbered</span>
              </button>

              <button
                type="button"
                className={`tool-button`}
                onClick={() => insertFormatting('code')}
                title="Code"
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