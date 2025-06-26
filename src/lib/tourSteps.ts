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
    path: "IdeationSpace",
    menuState: "open", // Open the menu to show this item
  },
  {
    selector: '[data-tour-id="ideation-space-share-idea"]',
    title: "Share Your Ideas",
    content:
      "When you are in the Ideation Space, click this button to share a new idea.",
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
      "Each card represents an idea. You can expand it to read more, click on the speech bubble to add comments. You can also click on the building brick on one or more cards when creating a new idea, to show that they were an inspiration for your new idea. You can also evaluate the idea by clicking the dollar icon. Be aware that this will only appear after you've placed an evaluation. So if the Dollar sign is not there, click on EVALUATE CARD first.",
    path: "IdeationSpace",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-idea-assessments"]',
    title: "Idea Assessments",
    content:
      "Next, let's check out the assessment view. This page gives you a portfolio view of all evaluated ideas.",
    path: "IdeaAssessments",
    menuState: "open",
  },
  {
    selector: '[data-tour-id="assessment-chart"]',
    title: "Impact vs. Feasibility Chart",
    content:
      "This chart plots all evaluated ideas based on their average impact and feasibility scores. You only see ideas that you have evaluated. If you click on a card or a circle on the graph you will see more details on the idea.",
    path: "IdeaAssessments",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-player-dashboard"]',
    title: "Your Dashboard",
    content: "Now, let's look at your personal activity dashboard.",
    path: "PlayerPageView",
    menuState: "open",
  },
  {
    selector: '[data-tour-id="player-dashboard-stats"]',
    title: "Your Personal Stats",
    content:
      "Here you can see a summary of all your contributions and track your daily activity. You can also add a fun image for your player character on this page - remember however that you are playing anonymously!",
    path: "PlayerPageView",
    menuState: "closed",
  },
  {
    selector: '[data-tour-id="menu-player-ranking"]',
    title: "Rankings",
    content:
      "See how you stack up against your colleagues! This page shows the leaderboard where you can see how you are performing as an individual and as a team.",
    path: "PlayerRankingView",
    menuState: "open",
  },
  {
    selector: '[data-tour-id="ranking-table"]',
    title: "The Leaderboard",
    content:
      "This table ranks all participants by their Experience Points (XP). Click on the 'i' icon to see all the different ways that you can earn XPs.",
    path: "PlayerRankingView",
    menuState: "closed",
  },
  {
    selector: "body",
    title: "Tour Complete!",
    content:
      "You're now ready to explore the platform. Jump in, share your ideas, and let's innovate together!",
    path: "HomePage",
    menuState: "closed",
  },
];
