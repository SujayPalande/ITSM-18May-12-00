import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi there! I'm your IT Support Assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      let responseContent = "I'm not sure how to help with that yet. Try asking to 'create a ticket' or 'check status'.";
      const lowerInput = userMessage.content.toLowerCase();

      if (lowerInput.includes("create") && lowerInput.includes("ticket")) {
        responseContent = "I can help you create a ticket. Please describe the issue you're facing.";
      } else if (lowerInput.includes("status") || lowerInput.includes("check")) {
        responseContent = "You can check your ticket status on the 'My Tickets' page.";
      } else if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
        responseContent = "Hello! How can I assist you with your IT needs today?";
      }

      const botMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-[#0a2540] hover:bg-blue-900 text-white p-0 flex items-center justify-center transition-transform hover:scale-105"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-[400px]"
          >
            <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur-xl">
              <CardHeader className="bg-[#0a2540] text-white p-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black tracking-tight">IT Support Assistant</CardTitle>
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Active Resolution Hub</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-6" ref={scrollRef}>
                  <div className="space-y-6">
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-2xl text-sm font-semibold",
                          msg.role === "user" 
                            ? "bg-[#0a2540] text-white rounded-tr-none" 
                            : "bg-slate-100 text-slate-900 rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-slate-400 p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Assistant is thinking...</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="p-4 border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
                  <Input
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="h-12 bg-slate-50 border-transparent rounded-xl font-bold focus:bg-white transition-all shadow-none"
                  />
                  <Button type="submit" size="icon" className="h-12 w-12 rounded-xl bg-[#0a2540] hover:bg-blue-900 text-white shadow-lg shadow-blue-900/10" disabled={!inputValue.trim()}>
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
