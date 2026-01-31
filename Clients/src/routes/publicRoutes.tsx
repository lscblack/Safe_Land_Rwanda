// AppRoutes.tsx
import  { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import SafeLandLoader from "../loaders/fullpageloader";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ForgotPasswordPage } from "../pages/ForgotPassword";
import { NotFoundPage } from "../pages/PageNotFound";
import { DashboardLayout } from "../pages/Dashboard";



const Home = lazy(() => import("../pages/Home"));
import { PropertyListingPage } from '../pages/SinglePropertyView';
import { MarketplaceIndex } from "../pages/MarketPlace";


const AppRoutes = () => {
  return (
    <Suspense fallback={<SafeLandLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<DashboardLayout />} />
        <Route path="/properties" element={<MarketplaceIndex />} />
        <Route path="/properties/single" element={<PropertyListingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
