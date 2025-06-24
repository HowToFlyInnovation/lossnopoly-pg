// src/components/PlatformSideMenu.tsx
import React from "react";
import RankingIcon from "@/assets/icons/RankingPageIcon.png";
import PlayerPageIcon from "@/assets/icons/PlayerPageIcon.png";
import AssessmentPageIcon from "@/assets/icons/AssessmentPageIcon.png";
import HomePageIcon from "@/assets/icons/HomePageIcon.png";
import IdeationSpacePageIcon from "@/assets/icons/IdeationSpacePageIcon.png";
import SignOutIcon from "@/assets/icons/SignOutIcon.png";

const Logo =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/LoginLogo.png?alt=media&token=e189b962-fd15-4642-9d1f-28cfda595042";

const TourIcon = () => (
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
      d="M17 8l4 4m0 0l-4 4m4-4H3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 20.25c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9c0 2.18.78 4.17 2.07 5.62"
    />
  </svg>
);

interface MenuItemProps {
  id: string;
  text: string;
  visibleContent?: string;
  icon: React.ReactNode;
  // FIX: Make onClick handler's event type more specific and consistent
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  customTheme?: boolean;
  "data-tour-id"?: string;
}

interface PlatformSideMenuProps {
  // FIX: Ensure this matches the type in IdeationPlatform
  handleMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  handleSignOut: (event: React.MouseEvent) => void;
  visibleContent: string;
  menuActive: boolean;
  setMenuActive: (active: boolean) => void;
  customTheme?: boolean;
  onStartTour: () => void;
}

const menuItems = [
  {
    id: "HomePage",
    text: "Home Page",
    icon: HomePageIcon,
    tourId: "menu-home",
  },
  {
    id: "IdeationSpace",
    text: "Ideation Space",
    icon: IdeationSpacePageIcon,
    tourId: "menu-ideation-space",
  },
  {
    id: "IdeaAssessments",
    text: "Idea Assessments",
    icon: AssessmentPageIcon,
    tourId: "menu-idea-assessments",
  },
];

const MenuItem: React.FC<MenuItemProps> = ({
  id,
  visibleContent,
  onClick,
  text,
  customTheme,
  icon,
  "data-tour-id": dataTourId,
}) => {
  const isActive = visibleContent === id;

  const baseClasses =
    "flex items-center w-full h-10 text-sm text-black/80 box-border pl-[10%] my-0.5 group cursor-pointer no-underline";
  const activeClasses = customTheme
    ? "bg-[#F7A800] text-white"
    : "bg-[#22222A] text-white";
  const itemHoverClasses = customTheme
    ? "hover:bg-[#F7A800] hover:text-white"
    : "hover:bg-[#22222A] hover:text-white";

  return (
    <div
      id={id}
      onClick={onClick}
      className={`${baseClasses} ${
        isActive ? activeClasses : ""
      } ${itemHoverClasses}`}
      data-tour-id={dataTourId}
    >
      {typeof icon === "string" ? (
        <img
          src={icon}
          alt=""
          className={`h-6 mr-4 ${
            isActive ? "filter invert" : ""
          } group-hover:filter group-hover:invert`}
        />
      ) : (
        <div
          className={`mr-4 ${
            isActive ? "text-white" : "text-black/80"
          } group-hover:text-white`}
        >
          {icon}
        </div>
      )}
      <span className="w-full">{text}</span>
    </div>
  );
};

const MenuCloseButton: React.FC<{
  setMenuActive: (active: boolean) => void;
}> = ({ setMenuActive }) => (
  <button
    className="order-2 px-5 py-2.5 text-3xl font-sans text-black bg-transparent border-none cursor-pointer md:mr-2.5"
    onClick={() => setMenuActive(false)}
    aria-label="Close menu"
  >
    &times;
  </button>
);

const PlatformSideMenu: React.FC<PlatformSideMenuProps> = ({
  handleMenuClick,
  handleSignOut,
  visibleContent,
  menuActive,
  setMenuActive,
  onStartTour,
  customTheme = true,
}) => {
  if (!menuActive) return null;

  const handleItemClick = (event: React.MouseEvent<HTMLElement>) => {
    handleMenuClick(event);
    if (window.innerWidth <= 768) {
      setMenuActive(false);
    }
  };

  const menuBackground = customTheme ? "bg-[#ddf1db]" : "bg-[#ddf1db]";

  return (
    <div
      className={`fixed top-0 left-0 z-1000 flex flex-col w-full h-screen shadow-[10px_0_10px_-5px_rgba(0,0,0,0.5)] md:w-[18%] ${menuBackground}`}
    >
      <header className="flex flex-row items-center justify-between w-full h-16 mt-7 mb-10 z-[2] flex-shrink-0">
        <img
          className="relative w-2/5 my-10 ml-5 md:w-2/4 md:top-1.5"
          alt="lossNOpolly Logo"
          src={Logo}
        />
        <MenuCloseButton setMenuActive={setMenuActive} />
      </header>

      <div className="flex-grow overflow-y-auto flex flex-col justify-between">
        <div className="w-full mx-auto mt-8">
          <h3 className="text-black text-base font-bold pl-[10%] mb-1">Menu</h3>
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              {...item}
              visibleContent={visibleContent}
              onClick={handleItemClick as any}
              customTheme={customTheme}
              data-tour-id={item.tourId}
            />
          ))}
        </div>

        <hr className="w-full mt-12 border-white/10" />

        <div className="w-full mx-auto mb-4">
          <h3 className="text-black text-base font-bold pl-[10%] mb-1">
            Game Stats
          </h3>
          <MenuItem
            id="PlayerPageView"
            onClick={handleItemClick as any}
            text="Activity Dashboard"
            visibleContent={visibleContent}
            customTheme={customTheme}
            icon={PlayerPageIcon}
            data-tour-id="menu-player-dashboard"
          />
          <MenuItem
            id="PlayerRankingView"
            onClick={handleItemClick as any}
            text="Player Ranking"
            visibleContent={visibleContent}
            customTheme={customTheme}
            icon={RankingIcon}
            data-tour-id="menu-player-ranking"
          />
        </div>

        <div className="w-full mx-auto mb-20">
          <h3 className="text-black text-base font-bold pl-[10%] mb-1">Help</h3>
          <MenuItem
            id="start-tour"
            onClick={onStartTour as any}
            text="Start Tour"
            icon={<TourIcon />}
            customTheme={customTheme}
            visibleContent={visibleContent}
            data-tour-id="start-tour-button"
          />
        </div>
      </div>

      <div className="w-full mt-auto pb-6 flex-shrink-0">
        <MenuItem
          id="BlackboxSignOut"
          onClick={handleSignOut}
          text="Sign Out"
          visibleContent={visibleContent}
          customTheme={customTheme}
          icon={SignOutIcon}
        />
      </div>
    </div>
  );
};

export default PlatformSideMenu;
