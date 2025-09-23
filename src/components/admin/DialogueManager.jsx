import React, { useState } from 'react';
import { ResponsiveButton, ResponsiveInput, ResponsiveLabel, ResponsiveText } from '../common/ResponsiveContainer';

const DialogueManager = ({ 
  dialogues = [], 
  onAdd, 
  onDelete, 
  isSaving = false 
}) => {
  const [newMessage, setNewMessage] = useState('');

  const handleAdd = () => {
    if (newMessage.trim() && onAdd) {
      onAdd(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isSaving) {
      handleAdd();
    }
  };

  return (
    <>
      {/* 添加新對話 */}
      <div className="space-y-4 mb-6">
        <ResponsiveLabel htmlFor="newMessage">
          添加新對話
        </ResponsiveLabel>
        <div className="flex gap-2">
          <ResponsiveInput
            id="newMessage"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSaving}
            placeholder="輸入新對話內容..."
            onKeyPress={handleKeyPress}
          />
          <ResponsiveButton
            onClick={handleAdd}
            disabled={isSaving || !newMessage.trim()}
            loading={isSaving}
          >
            {isSaving ? '添加中...' : '添加'}
          </ResponsiveButton>
        </div>
      </div>
        
      {/* 對話列表 */}
      <div className="space-y-3">
        <ResponsiveLabel>
          對話列表 ({dialogues.length}條)
        </ResponsiveLabel>
        <div className="max-h-64 overflow-y-auto space-y-2 border border-white/10 rounded-lg p-3">
          {dialogues.length === 0 ? (
            <ResponsiveText color="secondary" className="text-center py-4">
              暫無對話內容
            </ResponsiveText>
          ) : (
            dialogues.map((text, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <ResponsiveText className="flex-1">{text}</ResponsiveText>
                <ResponsiveButton
                  onClick={() => onDelete && onDelete(index)}
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="刪除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </ResponsiveButton>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default DialogueManager;
