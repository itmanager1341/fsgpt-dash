
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import UserApprovalGuard from "./components/UserApprovalGuard";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import ManagePage from "./pages/ManagePage";
import AdminPage from "./pages/AdminPage";
import Import from "./pages/Import";
import HowPage from "./pages/HowPage";
import WhyPage from "./pages/WhyPage";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Create QueryClient instance outside of component to avoid recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserApprovalGuard>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/search" element={<Navigate to="/chat" replace />} />
                      <Route path="/manage" element={<ManagePage />} />
                      <Route path="/admin" element={
                        <AdminRoute>
                          <AdminPage />
                        </AdminRoute>
                      } />
                      <Route path="/import" element={<Import />} />
                      <Route path="/how" element={<HowPage />} />
                      <Route path="/why" element={<WhyPage />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </UserApprovalGuard>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
