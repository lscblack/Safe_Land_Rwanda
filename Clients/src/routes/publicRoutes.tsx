// AppRoutes.tsx
import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import SafeLandLoader from "../loaders/fullpageloader";


const Home = lazy(() => import("../pages/Home"));


const AppRoutes = () => {
  return (
    <Suspense fallback={<SafeLandLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
