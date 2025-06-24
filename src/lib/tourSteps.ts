// src/lib/tourSteps.ts
export interface TourStep {
  selector: string;
  title: string;
  content: string;
  path: string;
  menuState?: "open" | "closed"; // New property
}

export const tourSteps: TourStep[] = [
  {
    selector: '[data-tour-id="home-welcome"]',
    title: "Welcome to the Platform!",
    content:
      "This is your homepage. Let's start by exploring the main navigation menu.",
    path: "HomePage",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-ideation-space"]',
    title: "Ideation Space",
    content:
      "This is the heart of the platform. Click here to view, create, and collaborate on ideas.",
    path: "HomePage",
    menuState: "open", // Open the menu to show this item
  },
  {
    selector: '[data-tour-id="ideation-space-share-idea"]',
    title: "Share Your Ideas",
    content:
      "Click this button to share a new idea or build upon existing ones you've selected.",
    path: "IdeationSpace",
    menuState: "closed", // Close the menu to show the page
  },
  {
    selector: '[data-tour-id="ideation-space-filters"]',
    title: "Filter & Sort",
    content:
      "Use these dropdowns to filter ideas based on your activity or by the specific sub-challenge.",
    path: "IdeationSpace",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="idea-tile-example"]',
    title: "Idea Cards",
    content:
      "Each card represents an idea. You can expand it to read more, evaluate it, comment, and select it to build upon.",
    path: "IdeationSpace",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-idea-assessments"]',
    title: "Idea Assessments",
    content:
      "Next, let's check out the assessment view. This page gives you a portfolio view of all evaluated ideas.",
    path: "IdeationSpace",
    menuState: "open",
  },
  {
    selector: '[data-tour-id="assessment-chart"]',
    title: "Impact vs. Feasibility Chart",
    content:
      "This chart plots all evaluated ideas based on their average impact and feasibility scores.",
    path: "IdeaAssessments",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-player-ranking"]',
    title: "Player Rankings",
    content:
      "See how you stack up against your colleagues! This page shows the leaderboard.",
    path: "IdeaAssessments",
    menuState: "open",
  },
  {
    selector: '[data-tour-id="ranking-table"]',
    title: "The Leaderboard",
    content:
      "This table ranks all participants by their Experience Points (XP).",
    path: "PlayerRankingView",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-player-dashboard"]',
    title: "Your Dashboard",
    content: "Finally, let's look at your personal activity dashboard.",
    path: "PlayerRankingView",
    menuState: "open",
  },
  {
    selector: '[data-tour-id="player-dashboard-stats"]',
    title: "Your Personal Stats",
    content:
      "Here you can see a summary of all your contributions and track your daily activity.",
    path: "PlayerPageView",
    menuState: "closed",
  },
  {
    selector: "body",
    title: "Tour Complete!",
    content:
      "You're now ready to explore the platform. Jump in, share your ideas, and let's innovate together!",
    path: "PlayerPageView",
    menuState: "closed",
  },
];
