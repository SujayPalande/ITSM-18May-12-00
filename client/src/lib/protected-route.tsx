import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useState } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole = [],
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Role-based access control
  // Agents should have access to users page, so do not block them

  return <Route path={path} component={Component} />;
}