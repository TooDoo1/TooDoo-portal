import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import Index from "./pages/Index";
import Companies from "./pages/Companies";
import Pending from "./pages/Pending";
import CategoryPage from "./pages/CategoryPage";
import LoggIn from "./pages/LoggIn";
import Registration from "./pages/Registration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AdminLayout>
          <Routes>
            <Route path="/" element={<LoggIn />} />
            <Route path="/admin" element={<Index />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/category/:name" element={<CategoryPage />} />
            <Route path="/login" element={<LoggIn />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AdminLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
