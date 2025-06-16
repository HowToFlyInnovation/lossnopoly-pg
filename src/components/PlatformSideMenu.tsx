import React from "react";

// Assuming your logo is in the `public` folder or handled by your build process
const Logo =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/LoginLogo.png?alt=media&token=e189b962-fd15-4642-9d1f-28cfda595042";

// Interfaces for props
interface MenuItemProps {
  id: string;
  text: string;
  visibleContent?: string;
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
  { id: "HomePage", text: "Home Page" },
  { id: "IdeationSpace", text: "Ideation Space" },
  { id: "IdeaAssessments", text: "Idea Assessments" },
];

// ────────────────────────────────
// ❷ Sub-challenge deep-dives
// ────────────────────────────────
const missionItems = [
  { id: "Mission1", text: "E2E Touchless Supply Chain" },
  { id: "Mission2", text: "E2E Touchless Innovation" },
  { id: "Mission3", text: "Zero Waste" },
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
    "flex items-center w-full h-10 text-sm text-white/80 box-border pl-[10%] my-0.5";
  const activeClasses = customTheme
    ? "bg-[#F7A800] text-white"
    : "bg-[#22222A] text-white";
  const hoverClasses = customTheme
    ? "hover:bg-[#F7A800] hover:text-white"
    : "hover:bg-[#22222A] hover:text-white";

  return (
    <a id={id} onClick={onClick} className="cursor-pointer no-underline">
      <div
        className={`${baseClasses} ${
          isActive ? activeClasses : ""
        } ${hoverClasses}`}
      >
        <span className="w-full">{text}</span>
      </div>
    </a>
  );
};

const MenuCloseButton: React.FC<{
  setMenuActive: (active: boolean) => void;
}> = ({ setMenuActive }) => (
  <button
    className="order-2 px-5 py-2.5 text-3xl font-sans text-white bg-transparent border-none cursor-pointer md:mr-2.5"
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
  customTheme = false,
}) => {
  if (!menuActive) return null;

  const menuBackground = customTheme ? "bg-[#CD2026]" : "bg-black";

  return (
    <div
      className={`fixed top-0 left-0 z-10 flex flex-col w-full h-screen shadow-[10px_0_10px_-5px_rgba(0,0,0,0.5)] md:w-[18%] ${menuBackground}`}
    >
      {/* ── Logo & close button ───────────────────────────────────────── */}
      <header className="flex flex-row items-center justify-between w-full h-16 mt-7 mb-10 z-[2]">
        <img
          className="relative w-2/5 my-10 ml-5 md:w-2/4 md:top-1.5"
          alt="lossNOpolly Logo"
          src={Logo}
        />
        <MenuCloseButton setMenuActive={setMenuActive} />
      </header>

      {/* ── Main menu ─────────────────────────────────────────────────── */}
      <div className="sticky w-full mx-auto">
        <h3 className="text-white text-base font-bold pl-[10%] mb-1">Menu</h3>
        {menuItems.map((item) => (
          <MenuItem
            key={item.id}
            {...item}
            visibleContent={visibleContent}
            onClick={handleMenuClick}
            customTheme={customTheme}
          />
        ))}
      </div>

      {/* ── Sub-challenge Deep-Dives ──────────────────────────────────── */}
      <div className="w-full mx-auto mt-12">
        <h3 className="text-white text-base font-bold pl-[10%] mb-1">
          Sub-challenges
        </h3>
        {missionItems.map((item) => (
          <MenuItem
            key={item.id}
            {...item}
            visibleContent={visibleContent}
            onClick={handleMenuClick}
            customTheme={customTheme}
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
        />
        <MenuItem
          id="PlayerRankingView"
          onClick={handleMenuClick}
          text="Player Ranking"
          visibleContent={visibleContent}
          customTheme={customTheme}
        />
      </div>

      <div className="absolute bottom-6 w-full">
        <MenuItem
          id="BlackboxSignOut"
          onClick={handleSignOut}
          text="Sign Out"
          customTheme={customTheme}
        />
      </div>
    </div>
  );
};

export default PlatformSideMenu;
