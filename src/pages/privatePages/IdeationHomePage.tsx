import React from "react";

// --- Type Definitions ---

// Defines the props for the ImageCard component
interface ImageCardProps {
  imageUrl: string;
  title: string;
  text: string;
  onActionClick: () => void;
}

// Defines the props for the main IdeationHomePage component
interface IdeationHomePageProps {
  // These props are kept for compatibility with the parent component,
  // though their direct styling effect has been removed in favor of Tailwind.
  customTheme: boolean;
  menuActive: boolean;

  setMenuActive: (active: boolean) => void;
  setVisibleContent: (content: string) => void;
}

// Defines the structure for an inspiration card object
interface InspirationCard {
  imageUrl: string;
  title: string;
  text: string;
  action: () => void;
}

// --- Sub-Components => The mission image card -------------------------------------------------------------------------------------------

const ImageCard: React.FC<ImageCardProps> = ({
  imageUrl,
  title,
  text,
  onActionClick,
}) => (
  <div
    onClick={onActionClick}
    className="bg-white border border-gray-200 rounded-lg shadow-md p-4 text-center cursor-pointer hover:shadow-xl transition-shadow duration-300 flex flex-col"
  >
    {/* Image Container */}
    <div className="mb-3">
      <img
        src={imageUrl}
        alt={title}
        className="max-w-full h-auto rounded-md mx-auto"
        // Error handler for broken image links
        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null; // prevents infinite loop
          target.src =
            "https://placehold.co/600x400/e2e8f0/4a5568?text=Image+Missing";
        }}
      />
    </div>

    {/* Card Content */}
    <div className="flex-grow">
      <h5 className="text-xl font-bold text-gray-800 mb-2">{title}</h5>
      <p className="text-base text-gray-600 mb-4">{text}</p>
    </div>

    {/* Action Button */}
    <div>
      <button
        onClick={onActionClick}
        className="py-2 px-5 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors duration-300"
      >
        Start Mission
      </button>
    </div>
  </div>
);

//------------------------------------------------------------------------------------------------------------*/

const IdeationHomePage: React.FC<IdeationHomePageProps> = ({
  setMenuActive,
  setVisibleContent,
}) => {
  // --- Event Handlers ---
  // These functions navigate to different "missions" in the application.

  const handleMission1Click = () => {
    setVisibleContent("BlackboxArcadeGameQuiz");
    setMenuActive(false);
  };

  const handleMission2Click = () => {
    setVisibleContent("BlackboxMission2ScavengerHuntLicence");
    setMenuActive(true);
  };

  const handleMission3Click = () => {
    setVisibleContent("BlackboxMission3SongPicker");
    setMenuActive(true);
  };

  // --- Data ---

  // Array of mission card data.
  // Placeholder URLs are used for images.
  const inspirationCards: InspirationCard[] = [
    {
      imageUrl: "https://placehold.co/600x400/a2c/fff?text=Mission+1",
      title: "Mission 1: Wild West Quiz",
      text: "Show what you know about CBN, OGSM, and SMART KPI's by capturing all the liers in the game.",
      action: handleMission1Click,
    },
    {
      imageUrl: "https://placehold.co/600x400/c2a/fff?text=Mission+2",
      title: "Mission 2: Scavenger Licence",
      text: "Complete your scavenger hunt licence by uploading a profile picture and completing a quick questionnaire.",
      action: handleMission2Click,
    },
    {
      imageUrl: "https://placehold.co/600x400/ac2/fff?text=Mission+3",
      title: "Mission 3: Jukebox",
      text: "Share a song that you believe entails the spirit of our CBN/OGSM.",
      action: handleMission3Click,
    },
  ];

  // --- Render ---

  return (
    <div className="p-5 font-sans bg-gray-50 min-h-screen w-screen">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
          Welcome to
          <br />
          lossNOpoly
        </h1>
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
          Using the lossNOpoly platform is pretty easy. Use the{" "}
          <strong className="font-semibold text-gray-700">
            menu bar on the left
          </strong>{" "}
          to navigate through the different Missions. Every week, a new mission
          will be unlocked.
        </p>
      </header>

      <main>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">
          <span role="img" aria-label="info icon" className="mr-2">
            ℹ️
          </span>
          Ready to get started?
        </h2>

        {/* Responsive Grid for Mission Cards.
          - 1 column on small screens (default)
          - 2 columns on medium screens (md:)
          - 3 columns on large screens (lg:)
          This single block replaces the need for separate mobile/desktop divs.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {inspirationCards.map((card, index) => (
            <ImageCard
              key={index}
              imageUrl={card.imageUrl}
              title={card.title}
              text={card.text}
              onActionClick={card.action}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default IdeationHomePage;
