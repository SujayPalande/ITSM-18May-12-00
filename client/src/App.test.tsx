import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Simple test component
function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          🎉 App is Loading Successfully!
        </h1>
        <p className="text-gray-600">
          If you can see this message, the React app is working properly.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            ✅ React is mounted<br />
            ✅ Vite build is working<br />
            ✅ Base path is configured<br />
            ✅ CSS is loading
          </p>
        </div>
      </div>
    </div>
  );
}

function SimpleRoutes() {
  return (
    <Switch>
      <Route path="/" component={TestPage} />
      <Route component={TestPage} />
    </Switch>
  );
}

function AppTest() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <SimpleRoutes />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default AppTest;