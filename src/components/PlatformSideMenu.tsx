import React from "react";
import RankingIcon from "@/assets/icons/RankingIcon.png";

// Assuming your logo is in the `public` folder or handled by your build process
const Logo =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/LoginLogo.png?alt=media&token=e189b962-fd15-4642-9d1f-28cfda595042";

// Interfaces for props
interface MenuItemProps {
  id: string;
  text: string;
  visibleContent?: string;
  icon: string;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  customTheme?: boolean;
}

interface PlatformSideMenuProps {
  handleMenuClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  handleSignOut: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  visibleContent: string;
  menuActive: boolean;
  setMenuActive: (active: boolean) => void;
  customTheme?: boolean;
}

// ────────────────────────────────
// ❶ General-navigation items
// ────────────────────────────────
const menuItems = [
  { id: "HomePage", text: "Home Page", icon: RankingIcon },
  { id: "IdeationSpace", text: "Ideation Space", icon: RankingIcon },
  { id: "IdeaAssessments", text: "Idea Assessments", icon: RankingIcon },
];

// ────────────────────────────────
// ❷ Sub-challenge deep-dives
// ────────────────────────────────
const missionItems = [
  { id: "Mission1", text: "E2E Touchless Supply Chain", icon: RankingIcon },
  { id: "Mission2", text: "E2E Touchless Innovation", icon: RankingIcon },
  { id: "Mission3", text: "Zero Waste", icon: RankingIcon },
];

const MenuItem: React.FC<MenuItemProps> = ({
  id,
  visibleContent,
  onClick,
  text,
  customTheme,
}) => {
  const isActive = visibleContent === id;

  const baseClasses =
    "flex items-center w-full h-10 text-sm text-black/80 box-border pl-[10%] my-0.5 group"; // Added 'group' class here
  const activeClasses = customTheme
    ? "bg-[#F7A800] text-white"
    : "bg-[#22222A] text-white";
  const itemHoverClasses = customTheme
    ? "hover:bg-[#F7A800] hover:text-white"
    : "hover:bg-[#22222A] hover:text-white";

  return (
    <a id={id} onClick={onClick} className="cursor-pointer no-underline">
      <div
        className={`${baseClasses} ${
          isActive ? activeClasses : ""
        } ${itemHoverClasses}`}
      >
        <img
          src={RankingIcon}
          className={`h-6 mr-4 ${
            isActive ? "filter invert" : ""
          } group-hover:filter group-hover:invert`} // Added group-hover classes
        />
        <span className="w-full">{text}</span>
      </div>
    </a>
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
  customTheme = true,
}) => {
  if (!menuActive) return null;

  const menuBackground = customTheme ? "bg-[#ddf1db]" : "bg-[#ddf1db]";

  return (
    <div
      className={`fixed top-0 left-0 z-10000 flex flex-col w-full h-screen shadow-[10px_0_10px_-5px_rgba(0,0,0,0.5)] md:w-[18%] ${menuBackground}`}
    >
      {/* ── Logo & close button ───────────────────────────────────────── */}
      <header className="flex flex-row items-center justify-between w-full h-16 mt-7 mb-10 z-[2] flex-shrink-0">
        <img
          className="relative w-2/5 my-10 ml-5 md:w-2/4 md:top-1.5"
          alt="lossNOpolly Logo"
          src={Logo}
        />
        <MenuCloseButton setMenuActive={setMenuActive} />
      </header>

      {/* Scrollable container for menu items */}
      <div className="flex-grow overflow-y-auto">
        {/* ── Main menu ─────────────────────────────────────────────────── */}
        <div className="w-full mx-auto">
          <h3 className="text-black text-base font-bold pl-[10%] mb-1">Menu</h3>
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              {...item}
              visibleContent={visibleContent}
              onClick={handleMenuClick}
              customTheme={customTheme}
              icon={item.icon}
            />
          ))}
        </div>

        {/* ── Sub-challenge Deep-Dives ──────────────────────────────────── */}
        <div className="w-full mx-auto mt-12">
          <h3 className="text-black text-base font-bold pl-[10%] mb-1">
            Sub-challenges
          </h3>
          {missionItems.map((item) => (
            <MenuItem
              key={item.id}
              {...item}
              visibleContent={visibleContent}
              onClick={handleMenuClick}
              customTheme={customTheme}
              icon={item.icon}
            />
          ))}
        </div>

        {/* ── Extra items & footer ──────────────────────────────────────── */}
        <hr className="w-full mt-12 border-white/10" />

        <div className="w-full mx-auto mt-0">
          <MenuItem
            id="PlayerPageView"
            onClick={handleMenuClick}
            text="Player Page"
            visibleContent={visibleContent}
            customTheme={customTheme}
            icon={RankingIcon}
          />
          <MenuItem
            id="PlayerRankingView"
            onClick={handleMenuClick}
            text="Player Ranking"
            visibleContent={visibleContent}
            customTheme={customTheme}
            icon={RankingIcon}
          />
        </div>
      </div>

      {/* Sign Out button pushed to the bottom */}
      <div className="w-full mt-auto pb-6 flex-shrink-0">
        <MenuItem
          id="BlackboxSignOut"
          onClick={handleSignOut}
          text="Sign Out"
          customTheme={customTheme}
          icon={RankingIcon}
        />
      </div>
    </div>
  );
};

export default PlatformSideMenu;
