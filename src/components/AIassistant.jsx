import React, { useState, useRef, useEffect } from 'react'; 
import { getGenerativeModel } from "firebase/ai";
import { aiLogic } from '../firebase'; 

export default function AIassistant({ temp, ph, ec }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: "Hello! I am your AI Assistant. I'm here to help with your water quality or tilapia health questions." }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading, isOpen]);

  // NEW: State to track which follow-up set to display
  const [currentQuestions, setCurrentQuestions] = useState([
    "What is the overall condition for my fish pond with the metrics measured?",
    "How are the metrics value going to affect my Tilapia fish health?",
    "What is my fish pond condition now and what is the solution need to take?",
    "What is the Non-ionised toxic Ammonia level fraction (NH3) of my pond according to the metrics, and what is the effect?"
  ]);

  // UPDATED SYSTEM INSTRUCTION: Explicitly forcing emoji, point forms, and bolding key phrases
  const model = getGenerativeModel(aiLogic, { 
    model: "gemini-3.5-flash",
    systemInstruction: `You are an expert, highly encouraging aquaculture assistant for a tilapia farmer in Malaysia. 
    RULE 1: You must ONLY answer questions related to pond health, water quality monitoring, practical solutions, and Malaysian hardware sourcing.
    RULE 2: CRITICAL FORMATTING RULE: You must NEVER write answers in long paragraph essays. You MUST always use distinct bullet points, insert engaging emojis at the start of key points to catch attention, and use double asterisks (**important phrase**) to bold highly critical numbers or action items so the farmer can scan information instantly.
    RULE 3: Keep explanations practical, easy to understand, and limited to a maximum of 3-4 bullet points.`
  });

  // NEW: Dictionary defining unique follow-up questions for each specific action choice
  const followUpMap = {
    0: [
      "📈 What sensor thresholds indicate excellent water quality?",
      "🔄 How frequently should I take manual readings to double-check my sensors?",
      "🛑 What is the first warning sign that pond conditions are crashing?",
      "🛍️ Where can I buy a reliable secondary liquid test kit in Malaysia?"
    ],
    1: [
      "🐟 What behavior shows that Tilapia are suffering from low oxygen?",
      "🌡️ Can high temperatures cause my Tilapia to stop feeding entirely?",
      "🛡️ How can I boost fish immunity when water conditions are sub-optimal?",
      "🛒 Where can I get premium high-protein Tilapia feed online via Shopee?"
    ],
    2: [
      "⚙️ How long should I run my aerator pump if oxygen drops?",
      "🚰 What percentage of a water change is safe for Tilapia during an emergency?",
      "🌿 Are there natural ways to stabilize the pH of my pond water safely?",
      "🏪 Where can I find affordable water pumps or aeration tubing in Johor?"
    ],
    3: [
      "🧪 Do you want to know where to buy ammonia detoxifying treatments online?",
      "👀 Do you want to know how to observe your fish for signs of ammonia burning?",
      "📉 How does lowering my pond water pH reduce toxic NH₃ instantly?",
      "⚠️ At what exact percentage level does toxic ammonia become lethal to fry?"
    ]
  };

const sendPrompt = async (textToSubmit, indexClicked = null) => {
    if (!textToSubmit.trim()) return;

    const newChat = [...chatHistory, { role: 'user', text: textToSubmit }];
    setChatHistory(newChat);
    setUserInput("");
    setIsLoading(true);

    // NEW: If the user clicked a structured option, immediately swap in its custom follow-ups
    if (indexClicked !== null && followUpMap[indexClicked]) {
      setCurrentQuestions(followUpMap[indexClicked]);
    } else if (indexClicked !== null) {
      // Fallback: If they clicked a follow-up, reset or shift to another logical branch
      setCurrentQuestions([
        "What is the overall condition for my fish pond with the metrics measured?",
        "How are the metrics value going to affect my Tilapia fish health?",
        "What is my fish pond condition now and what is the solution need to take?",
        "What is the Non-ionised toxic Ammonia level fraction (NH3) of my pond according to the metrics, and what is the effect?"
      ]);
    }

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
      setChatHistory([...newChat, { role: 'model', text: userMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendPrompt(userInput, 99);
  };

const renderFormattedText = (text) => {
    let cleanText = text
      .replace(/\$?NH_3\$?/g, 'NH₃')
      .replace(/\$?NH_4\^\+\$?|\$?NH_4\+\$?/g, 'NH₄⁺');

    // Split rows to check if AI responded in bullet point blocks
    const lines = cleanText.split('\n');
    return lines.map((line, lineIdx) => {
      let content = line;
      let isBullet = false;
      
      if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
        content = line.replace(/^[\s*-]+/, '');
        isBullet = true;
      }

      const parts = content.split(/(\*\*.*?\*\*)/g);
      const parsedElements = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return isBullet ? (
        <div key={lineIdx} className="flex items-start gap-2 ml-2 my-1">
          <span className="text-blue-500 mt-1 shrink-0">•</span>
          <span>{parsedElements}</span>
        </div>
      ) : (
        <p key={lineIdx} className="my-0.5">{parsedElements}</p>
      );
    });
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

            {/* Chat History & Action Options */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white scrollbar-thin">
              
              {/* Render chat messages using formatting function */}
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200'
                  }`}>
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              ))}

              {/* 3. MODIFIED: Suggested questions now remain visible at the bottom as continuous follow-up choices when not loading */}
              {!isLoading && (
                  <div className="flex flex-col gap-2 mt-4 pt-2 border-t border-dashed border-slate-100">
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1 mb-1">
                    Follow-up Options
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {currentQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => sendPrompt(question, index)}
                        className="text-left text-xs bg-blue-50/60 text-blue-700 hover:bg-blue-100/80 border border-blue-100/60 rounded-xl p-2.5 transition-colors font-medium shadow-sm"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl text-sm rounded-bl-none animate-pulse border border-slate-200">
                    Thinking...
                  </div>
                </div>
              )}

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