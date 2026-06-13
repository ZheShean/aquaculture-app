import React, { useState, useRef, useEffect } from 'react'; // 1. Imported useRef and useEffect
import { getGenerativeModel } from "firebase/ai";
import { aiLogic } from '../firebase'; 

export default function AIassistant({ temp, ph, ec }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: "Hello! I am your AI Assistant. I'm here to help with your water quality or tilapia health questions." }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2. Created a reference to track the bottom of the chat container
  const messagesEndRef = useRef(null);

  // 3. Function that forces the scroll window down smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 4. Automatically trigger the scroll whenever chat content changes or modal opens
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading, isOpen]);

  // System Instructions (The Guardrails)
  const model = getGenerativeModel(aiLogic, { 
    model: "gemini-3.5-flash",
    systemInstruction: `You are an expert aquaculture assistant for a tilapia farmer. 
    RULE 1: You must ONLY answer questions related to pond health, water quality monitoring, and solutions for sub-optimal conditions. 
    RULE 2: If the user asks about ANYTHING else, you must reply exactly with: "I'm sorry, that is outside my scope. I can only assist with questions regarding your tilapia pond health and water quality."
    RULE 3: Keep all valid answers short, practical, and highly actionable. Maximum 3 sentences.`
  });

  // Suggested Questions
  const suggestedQuestions = [
    "What is the overall condition for my fish pond with the metrics measured?",
    "How are the metrics value going to affect my Tilapia fish health?",
    "What is my fish pond condition now and what is the solution need to take?",
    "What is the Non-ionised toxic Ammonia level fraction (NH3) of my pond according to the metrics, and what is the effect?"
  ];

  const sendPrompt = async (textToSubmit) => {
    if (!textToSubmit.trim()) return;

    const newChat = [...chatHistory, { role: 'user', text: textToSubmit }];
    setChatHistory(newChat);
    setUserInput("");
    setIsLoading(true);

    try {
      const chat = model.startChat();
      
      const enrichedPrompt = `
        Current Pond Status: Temp: ${temp}°C, pH: ${ph}, EC: ${Math.round(ec * 1000)} µS/cm.
        Farmer's Question: ${textToSubmit}
      `;

      const result = await chat.sendMessage(enrichedPrompt);
      const aiResponse = result.response.text();

      setChatHistory([...newChat, { role: 'model', text: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      let userMessage = "Sorry, I am having trouble connecting to the network right now.";
      if (error.message?.includes("429") || error.message?.includes("credits are depleted")) {
        userMessage = "The AI service is currently unavailable due to billing limits. Please check back later.";
      }
      setChatHistory([...newChat, { role: 'model', text: userMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendPrompt(userInput);
  };

  return (
    <>
      {/* THE BUTTON */}
      <button 
        onClick={() => setIsOpen(true)}
        className="animate-gemini-pulse ml-4 flex items-center justify-center gap-1 border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50 transition-colors rounded-xl px-4 py-2 font-bold whitespace-nowrap shadow-sm"
      >
        AI Assistant <span className="text-xl leading-none">✨</span>
      </button>

      {/* THE MODAL */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-lg flex flex-col h-[600px] overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  AI Assistant ✨
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Latest Pond Data: {temp}°C | pH {ph} | {Math.round(ec * 1000)} µS/cm
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl p-2"
              >
                ✕
              </button>
            </div>

            {/* Chat History & Suggested Questions */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white scrollbar-thin">
              
              {/* Render actual chat messages */}
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Show suggested questions if chat is empty */}
              {chatHistory.length === 1 && !isLoading && (
                <div className="flex flex-col gap-2 mt-2 ml-2">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Suggested Questions</p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => sendPrompt(question)}
                      className="text-left text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl p-3 transition-colors shadow-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl text-sm rounded-bl-none animate-pulse border border-slate-200">
                    Thinking...
                  </div>
                </div>
              )}

              {/* 5. HIDDEN SCROLL ANCHOR - The window will automatically snap to this point */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask for advice..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}