import React from "react";
import RankingIcon from "@/assets/icons/RankingPageIcon.png";
import PlayerPageIcon from "@/assets/icons/PlayerPageIcon.png";
import AssessmentPageIcon from "@/assets/icons/AssessmentPageIcon.png";
import HomePageIcon from "@/assets/icons/HomePageIcon.png";
import IdeationSpacePageIcon from "@/assets/icons/IdeationSpacePageIcon.png";
import SignOutIcon from "@/assets/icons/SignOutIcon.png";

const Logo =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/LoginLogo.png?alt=media&token=e189b962-fd15-4642-9d1f-28cfda595042";

interface MenuItemProps {
  id: string;
  text: string;
  visibleContent?: string;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  customTheme?: boolean;
  "data-tour-id"?: string;
}

interface PlatformSideMenuProps {
  handleMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  handleSignOut: (event: React.MouseEvent) => void;
  visibleContent: string;
  menuActive: boolean;
  setMenuActive: (active: boolean) => void;
  customTheme?: boolean;
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
    "flex items-center w-full text-base md:text-sm text-black/80 box-border pl-[10%] my-0.5 group cursor-pointer no-underline py-4 md:py-0 md:h-10";
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
  // This button is part of the header and allows closing on desktop as well.
  <button
    className="order-2 px-5 py-2.5 text-4xl font-sans text-black bg-transparent border-none cursor-pointer"
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
  customTheme = true,
}) => {
  const menuVisibilityClasses = menuActive
    ? "translate-x-0"
    : "-translate-x-full";

  // CORRECTED: This function now checks the screen width before closing the menu.
  const handleItemClick = (event: React.MouseEvent<HTMLElement>) => {
    handleMenuClick(event);
    // Only close the menu automatically on mobile screens (width <= 768px).
    if (window.innerWidth <= 768) {
      setMenuActive(false);
    }
  };

  const menuBackground = customTheme ? "bg-[#ddf1db]" : "bg-[#ddf1db]";

  return (
    <>
      {/* Mobile-only overlay to close the menu when clicking outside */}
      {menuActive && (
        <div
          className="fixed inset-0 z-[999] bg-black/50 md:hidden"
          onClick={() => setMenuActive(false)}
        ></div>
      )}

      <div
        className={`fixed top-0 left-0 z-[1000] flex flex-col w-[85%] h-screen shadow-lg md:shadow-[10px_0_10px_-5px_rgba(0,0,0,0.5)] md:w-[18%] ${menuBackground} transition-transform duration-300 ease-in-out ${menuVisibilityClasses}`}
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
          <div className="w-full mx-auto mt-4">
            <h3 className="text-black text-base font-bold pl-[10%] mb-1">
              Menu
            </h3>
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

          <div className="w-[90%] mx-auto mb-8 py-6 rounded bg-white/30">
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
              text="Rankings"
              visibleContent={visibleContent}
              customTheme={customTheme}
              icon={RankingIcon}
              data-tour-id="menu-player-ranking"
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
    </>
  );
};

export default PlatformSideMenu;
