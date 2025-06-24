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

// --- Type Definitions ---
interface IdeationPlatformProps {
  menuActive: boolean;
  setMenuActive: Dispatch<SetStateAction<boolean>>;
  visibleContent: string;
  setVisibleContent: Dispatch<SetStateAction<string>>;
  customTheme: boolean;
  // FIX: Update the signature to accept a more general HTMLElement event
  handleMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  // FIX: Update the event type to be more general
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setVisibleContent(event.currentTarget.id);
  };

  const handleMissionClick = (contentId: string) => {
    setVisibleContent(contentId);
    setMenuActive(false);
  };

  const handleTourNavigate = (path: string) => {
    setVisibleContent(path);
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
        onClose={() => setIsTourOpen(false)}
        onNavigate={handleTourNavigate}
      />
      <PlatformSideMenu
        menuActive={menuActive}
        setMenuActive={setMenuActive}
        visibleContent={visibleContent}
        handleMenuClick={handleMenuClick}
        handleSignOut={handleSignOut}
        customTheme={customTheme}
        onStartTour={() => setIsTourOpen(true)}
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
