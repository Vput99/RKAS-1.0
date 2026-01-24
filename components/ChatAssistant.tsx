
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Paperclip, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { chatWithFinancialAdvisor } from '../lib/gemini';
import { Budget } from '../types';

interface ChatAssistantProps {
  budgets: Budget[];
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ budgets }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    {role: 'bot', text: 'Halo! Saya asisten virtual RKAS. Ada yang bisa saya bantu? Anda juga bisa upload PDF/Foto dokumen untuk saya analisa.'}
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // File Upload State
  const [attachment, setAttachment] = useState<{file: File, base64: string, type: 'pdf' | 'image'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert("Ukuran file maksimal 5MB");
          return;
      }

      const reader = new FileReader();
      reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          const isPdf = file.type === 'application/pdf';
          setAttachment({
              file,
              base64: base64String,
              type: isPdf ? 'pdf' : 'image'
          });
      };
      reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;

    const userMsg = input;
    const currentAttachment = attachment;
    
    // UI Update
    setMessages(prev => [
        ...prev, 
        {
            role: 'user', 
            text: userMsg + (currentAttachment ? ` [Lampiran: ${currentAttachment.file.name}]` : '')
        }
    ]);
    
    setInput('');
    setAttachment(null); // Clear attachment from UI immediately
    setLoading(true);

    // Prepare context from current budget data
    const totalIncome = budgets.filter(b => b.type === 'pendapatan').reduce((a,b) => a+b.amount, 0);
    const totalExpense = budgets.filter(b => b.type === 'belanja').reduce((a,b) => a+b.amount, 0);
    const context = `Total Pendapatan: Rp${totalIncome}, Total Belanja: Rp${totalExpense}. Jumlah item belanja: ${budgets.filter(b => b.type === 'belanja').length}.`;

    const aiResponse = await chatWithFinancialAdvisor(
        userMsg || "Tolong analisa dokumen terlampir.", 
        context,
        currentAttachment ? { data: currentAttachment.base64, mimeType: currentAttachment.file.type } : undefined
    );
    
    setMessages(prev => [...prev, {role: 'bot', text: aiResponse || "Maaf, terjadi kesalahan."}]);
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-5 md:p-6 rounded-full shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all z-50 flex items-center justify-center border-4 border-white/20"
        title="Buka Asisten AI"
      >
        {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-4 md:bottom-32 md:right-8 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-40 flex flex-col h-[500px] animate-fade-in-up">
          <div className="bg-blue-600 p-4 text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
               <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold">Asisten RKAS</h3>
              <p className="text-xs text-blue-100">Support PDF & Gambar</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm text-gray-500 text-xs flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                   <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                   <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                   <span className="ml-1">Menganalisa...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview */}
          {attachment && (
              <div className="px-3 pt-2 bg-white border-t border-gray-100">
                  <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                          {attachment.type === 'pdf' ? <FileText size={16} className="text-red-500" /> : <ImageIcon size={16} className="text-blue-500" />}
                          <span className="truncate max-w-[200px] text-gray-700 font-medium">{attachment.file.name}</span>
                      </div>
                      <button onClick={clearAttachment} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={14} />
                      </button>
                  </div>
              </div>
          )}

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            {/* File Input */}
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf,image/*"
                onChange={handleFileSelect}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition ${attachment ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                title="Lampirkan PDF/Gambar"
            >
                <Paperclip size={20} />
            </button>

            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={attachment ? "Tanyakan tentang file ini..." : "Ketik pesan..."}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleSend}
              disabled={loading || (!input.trim() && !attachment)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
