import { useState, useRef, useEffect, useCallback } from 'react';

interface Participant {
  _id: string;
  name: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  participants: Participant[];
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  participants,
  placeholder,
  rows = 2,
  disabled,
  className = '',
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const checkForMention = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = value.slice(0, cursorPos);

    // Find the last @ that isn't part of a completed mention
    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt === -1) {
      setShowDropdown(false);
      return;
    }

    // @ must be at start or preceded by a space/newline
    if (lastAt > 0 && !/\s/.test(textBefore[lastAt - 1])) {
      setShowDropdown(false);
      return;
    }

    const query = textBefore.slice(lastAt + 1);

    // If there's a space in the query after a valid match, close dropdown
    // (user moved on from mention)
    if (query.includes('\n')) {
      setShowDropdown(false);
      return;
    }

    setMentionStart(lastAt);
    setMentionQuery(query);
    setShowDropdown(true);
    setSelectedIndex(0);
  }, [value]);

  useEffect(() => {
    checkForMention();
  }, [checkForMention]);

  const insertMention = (participant: Participant) => {
    const before = value.slice(0, mentionStart);
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? value.length;
    const after = value.slice(cursorPos);

    const newValue = `${before}@${participant.name} ${after}`;
    onChange(newValue);
    setShowDropdown(false);

    // Focus back on textarea
    requestAnimationFrame(() => {
      if (textarea) {
        const newCursorPos = mentionStart + participant.name.length + 2; // @name + space
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredParticipants.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredParticipants.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredParticipants.length) % filteredParticipants.length);
    } else if (e.key === 'Enter' && showDropdown) {
      e.preventDefault();
      insertMention(filteredParticipants[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
      />

      {showDropdown && filteredParticipants.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-studio-darker border border-studio-gray rounded-lg shadow-lg z-40 max-h-40 overflow-y-auto">
          {filteredParticipants.map((participant, index) => (
            <button
              key={participant._id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent textarea blur
                insertMention(participant);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-studio-dark transition-colors ${
                index === selectedIndex ? 'bg-studio-dark text-studio-accent' : ''
              }`}
            >
              @{participant.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
