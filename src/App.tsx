
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import UserApprovalGuard from "./components/UserApprovalGuard";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import ManagePage from "./pages/ManagePage";
import Import from "./pages/Import";
import HowPage from "./pages/HowPage";
import WhyPage from "./pages/WhyPage";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import ChatPage from "./pages/ChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <UserApprovalGuard>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/manage" element={<ManagePage />} />
                <Route path="/import" element={<Import />} />
                <Route path="/how" element={<HowPage />} />
                <Route path="/why" element={<WhyPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserApprovalGuard>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
