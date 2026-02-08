import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import SafeLandLoader from "../loaders/fullpageloader";
import { useOnboardingCheck } from "../components/security/useOnboardingCheck";


// Lazy Imports
const Home = lazy(() => import("../pages/Home"));
const LoginPage = lazy(() => import("../pages/LoginPage").then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPassword").then(module => ({ default: module.ForgotPasswordPage })));
const NotFoundPage = lazy(() => import("../pages/PageNotFound").then(module => ({ default: module.NotFoundPage })));
const DashboardLayout = lazy(() => import("../pages/Dashboard").then(module => ({ default: module.DashboardLayout })));
const PropertyListingPage = lazy(() => import("../pages/SinglePropertyView").then(module => ({ default: module.PropertyListingPage })));
const MarketplaceIndex = lazy(() => import("../pages/MarketPlace").then(module => ({ default: module.MarketplaceIndex })));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage").then(module => ({ default: module.OnboardingPage })));
const AboutPage = lazy(() => import("../pages/About").then(module => ({ default: module.AboutPage })));
const PartnersPage = lazy(() => import("../pages/OurAgents").then(module => ({ default: module.AgenciesPage })));
const RouteManager = () => {

  useOnboardingCheck(); // Runs the 1-day reset check
  return null; // Renders nothing visible
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<SafeLandLoader />}>
      {/* Run the check on every route change */}
      <RouteManager />

      <Routes>
        {/* New Onboarding Route */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<DashboardLayout />} />
        <Route path="/properties" element={<MarketplaceIndex />} />
        <Route path="/properties/single" element={<PropertyListingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/our-agents" element={<PartnersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;