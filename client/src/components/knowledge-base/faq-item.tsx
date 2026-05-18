import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Faq } from "@shared/schema";
import { ThumbsUp, Share2 } from "lucide-react";

interface FAQItemProps {
  faq: Faq;
  categoryName: string;
}

export default function FAQItem({ faq, categoryName }: FAQItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [helpful, setHelpful] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const markHelpful = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHelpful(true);
  };

  const shareItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create a shareable URL for this FAQ
    const shareUrl = `${window.location.origin}/knowledge-base?faq=${faq.id}`;
    
    // Check if the browser supports the Web Share API
    if (navigator.share) {
      navigator.share({
        title: faq.question,
        text: `Check out this FAQ: ${faq.question}`,
        url: shareUrl,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback to copying the URL to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard');
      }).catch(err => {
        console.error('Error copying to clipboard:', err);
      });
    }
  };

  return (
    <Card 
      id={`faq-${faq.id}`}
      className={`group transition-all duration-500 border-none rounded-[2rem] overflow-hidden ${expanded ? "ring-2 ring-blue-600/20 shadow-2xl bg-white scale-[1.01]" : "hover:shadow-xl hover:shadow-slate-200/50 bg-white/80"}`}
      onClick={toggleExpand}
    >
      <CardHeader className="p-8 cursor-pointer relative z-10">
        <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex justify-between items-center gap-6">
          <span className="flex-1">{faq.question}</span>
          <div className={cn(
             "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500",
             expanded ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
          )}>
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 15 15" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform duration-500 ${expanded ? "rotate-180" : "rotate-0"}`}
            >
              <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          </div>
        </CardTitle>
        <div className="flex items-center gap-3 mt-4">
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded-md">Reference: {categoryName}</span>
           <div className="h-1 w-1 rounded-full bg-slate-200"></div>
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global Protocol</span>
        </div>
      </CardHeader>
      <CardContent className={`px-8 overflow-hidden transition-all duration-500 ${expanded ? "pb-8 max-h-[1000px] opacity-100" : "max-h-0 p-0 opacity-0"}`}>
        <div className="pt-2 border-t border-slate-50 mt-2">
          <p className="text-slate-600 text-base font-medium leading-relaxed mb-8 whitespace-pre-wrap">
             {faq.answer}
          </p>
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
               <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                     <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-slate-200"></div>
                     </div>
                  ))}
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified by 12+ agents</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                   "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                   helpful ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'
                )}
                onClick={markHelpful}
                disabled={helpful}
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-2" />
                {helpful ? 'Protocol Effective' : 'Mark Effective'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-all"
                onClick={shareItem}
              >
                <Share2 className="h-3.5 w-3.5 mr-2" />
                Share Link
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

  );
}
