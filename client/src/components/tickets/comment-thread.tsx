import { User, Shield, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CommentThreadProps {
  comments: {
    id: number;
    content: string;
    createdAt: string | Date | null;
    isInternal: boolean;
    user: {
      id: number;
      name: string;
      role: string;
    };
  }[];
  currentUserRole: string;
}

export default function CommentThread({ comments, currentUserRole }: CommentThreadProps) {
  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Never';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Filter out internal comments if user is not admin or agent
  const visibleComments = comments.filter(comment => 
    !comment.isInternal || 
    currentUserRole === "admin" || 
    currentUserRole === "agent"
  );

  if (visibleComments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        No comments yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleComments.map((comment, index) => (
        <div 
          key={comment.id} 
          className={`bg-white rounded-lg shadow p-6 ${comment.user.role === 'agent' || comment.user.role === 'admin' ? 'bg-blue-50' : ''}`}
          id={`comment-${comment.id}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                comment.user.role === 'agent' || comment.user.role === 'admin' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {comment.user.role === 'agent' || comment.user.role === 'admin' 
                  ? <Shield className="h-5 w-5" /> 
                  : <User className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-medium text-gray-800">{comment.user.name}</h3>
                <div className="flex items-center">
                  <p className="text-sm text-gray-500">{formatDate(comment.createdAt)}</p>
                  {(comment.user.role === 'agent' || comment.user.role === 'admin') && (
                    <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {comment.user.role === 'agent' ? 'Support Agent' : 'Admin'}
                    </Badge>
                  )}
                  {comment.isInternal && (
                    <Badge variant="outline" className="ml-2 bg-gray-800 text-white hover:bg-gray-800">
                      Internal Note
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-gray-700 whitespace-pre-wrap">
            {comment.content}
          </div>
        </div>
      ))}
    </div>
  );
}
