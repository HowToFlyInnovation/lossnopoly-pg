/*
This is an altered file: src/pages/privatePages/IdeationPlatform.tsx
*/
// src/pages/privatePages/IdeationPlatform.tsx
import React, { useContext, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { AuthContext, type AuthContextType } from "../context/AuthContext";
import PlatformSideMenu from "../../components/PlatformSideMenu";
import type { Dispatch, SetStateAction } from "react";
import HomePageView from "./views/HomePageView";
import IdeationSpaceView from "./views/IdeationSpaceView";
import IdeaAssessmentViewPage from "./views/IdeaAssessmentViewPage";
import PlayerRankingView from "./views/PlayerRankingView";
import PlayerPageView from "./views/PlayerPageView";
import Tour from "../../components/Tour";
import { tourSteps } from "../../lib/tourSteps";
import AdminView from "./views/AdminView";

// --- Type Definitions ---
interface IdeationPlatformProps {
  menuActive: boolean;
  setMenuActive: Dispatch<SetStateAction<boolean>>;
  visibleContent: string;
  setVisibleContent: Dispatch<SetStateAction<string>>;
  customTheme: boolean;
}

// --- Reusable SVG Icon for the Menu Button ---
const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

// --- Main Component ---
const IdeationPlatform: React.FC<IdeationPlatformProps> = ({
  menuActive,
  setMenuActive,
  visibleContent,
  setVisibleContent,
  customTheme,
}) => {
  const { dispatch } = useContext(AuthContext) as AuthContextType;
  const [isTourOpen, setIsTourOpen] = useState(false);
  const onStartTour = () => setIsTourOpen(true);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setVisibleContent(event.currentTarget.id);
    // On mobile, also close the menu when a navigation item is clicked
    if (window.innerWidth <= 768) {
      setMenuActive(false);
    }
  };

  const handleMissionClick = (contentId: string) => {
    setVisibleContent(contentId);
    setMenuActive(false);
  };

  const handleTourNavigate = (path: string) => {
    setVisibleContent(path);
  };

  const handleTourClose = () => {
    setVisibleContent("IdeationSpace");
    setIsTourOpen(false);
    if (window.innerWidth > 768) {
      setMenuActive(true);
    } else {
      setMenuActive(false);
    }
  };

  const mainContentClasses = `transition-all duration-300 ease-in-out ${
    menuActive ? "md:ml-[18%]" : "ml-0 w-full"
  }`;

  const renderContent = () => {
    switch (visibleContent) {
      case "HomePage":
        return (
          <HomePageView
            handleMissionClick={handleMissionClick}
            handleSignOut={handleSignOut}
            onStartTour={onStartTour}
          />
        );
      case "IdeationSpace":
        return <IdeationSpaceView />;
      case "IdeaAssessments":
        return <IdeaAssessmentViewPage />;
      case "PlayerPageView":
        return <PlayerPageView />;
      case "PlayerRankingView":
        return <PlayerRankingView />;
      case "AdminView":
        return <AdminView />;
      default:
        return (
          <div className="w-full h-screen flex justify-center items-center">
            {visibleContent} page under construction
          </div>
        );
    }
  };

  return (
    <div className="font-sans bg-gray-50 min-h-screen w-screen">
      <Tour
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={handleTourClose}
        onNavigate={handleTourNavigate}
        setMenuActive={setMenuActive}
      />
      <PlatformSideMenu
        menuActive={menuActive}
        setMenuActive={setMenuActive}
        visibleContent={visibleContent}
        handleMenuClick={handleMenuClick}
        handleSignOut={handleSignOut}
        customTheme={customTheme}
      />

      {!menuActive && (
        <button
          onClick={() => setMenuActive(true)}
          className="fixed top-4 left-4 z-20 p-2 bg-gray-800 text-white rounded-md shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
      )}

      <main className={mainContentClasses}>{renderContent()}</main>
    </div>
  );
};

export default IdeationPlatform;
