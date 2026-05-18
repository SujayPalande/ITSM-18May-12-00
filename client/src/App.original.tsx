import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import TicketsPage from "@/pages/tickets-page";
import TicketDetailPage from "@/pages/ticket-detail-page";
import TicketCreatePage from "@/pages/ticket-create-page";
import TicketEditPage from "@/pages/ticket-edit-page";
import KnowledgeBasePage from "@/pages/knowledge-base-page";
import AllTicketsPage from "@/pages/all-tickets-page";
import DocumentationPage from "@/pages/documentation-page";
import SettingsPage from "@/pages/settings-page";
import ReportsPage from "@/pages/admin/reports-page";
import UsersPage from "@/pages/admin/users-page";
import CategoriesPage from "@/pages/admin/categories-page";

function Routes() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/tickets" component={TicketsPage} />
      <ProtectedRoute
        path="/tickets/new"
        component={TicketCreatePage}
        requiredRole={["user", "admin", "agent"]}
      />
      <ProtectedRoute path="/tickets/:id/edit" component={TicketEditPage} />
      <ProtectedRoute path="/tickets/:id" component={TicketDetailPage} />
      <ProtectedRoute path="/knowledge-base" component={KnowledgeBasePage} />
      <ProtectedRoute path="/documentation" component={DocumentationPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute
        path="/all-tickets"
        component={AllTicketsPage}
        requiredRole={["admin"]}
      />
      <ProtectedRoute
        path="/admin/reports"
        component={ReportsPage}
        requiredRole={["admin"]}
      />
      <ProtectedRoute
        path="/admin/users"
        component={UsersPage}
        requiredRole={["admin"]}
      />
      <ProtectedRoute
        path="/admin/categories"
        component={CategoriesPage}
        requiredRole={["admin"]}
      />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen">
            <Routes />
            <Toaster />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
