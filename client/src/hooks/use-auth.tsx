import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, getApiUrl } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  name: string;
  email: string;
  role?: string;
  companyName?: string;
  department?: string;
  contactNumber?: string;
  designation?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        // Use raw fetch to avoid apiRequest throwing on 401
        const res = await fetch(getApiUrl("/api/user"), { credentials: "include" });
        if (res.status === 401) {
          return null; // Legacy catch
        }
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        const data = await res.json();
        // Handle custom 200 unauthenticated response to avoid console errors
        if (data.authenticated === false || data.error === 'Not authenticated') {
          return null;
        }
        return data;
      } catch (error) {
        return null;
      }
    },
    retry: 1, // Only retry once to avoid hanging
    retryDelay: 1000, // Wait 1 second before retry
    staleTime: 5000, // Consider data stale after 5 seconds
    gcTime: 10000, // Garbage collect after 10 seconds
  });



  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      toast({
        title: "Verification link sent",
        description: `A verification link has been sent to your email. Please check your inbox and verify your account before logging in.`,
      });
      // Do NOT set user as logged in until verified
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Unable to create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear user data from query cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Cancel any in-flight queries and clear all cached data without refetching
      queryClient.cancelQueries();
      queryClient.removeQueries();
      
      // Clear any localStorage items (if any auth tokens are stored there)
      // Note: The app uses HTTP-only cookies, but this ensures cleanup of any client-side data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
