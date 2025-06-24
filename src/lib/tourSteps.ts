// src/lib/tourSteps.ts
export interface TourStep {
  selector: string;
  title: string;
  content: string;
  path: string;
}

export const tourSteps: TourStep[] = [
  {
    selector: '[data-tour-id="home-welcome"]',
    title: "Welcome to the Platform!",
    content:
      "This is your homepage. Here you can see an overview of the challenges and your progress. Let's start by exploring the main navigation menu.",
    path: "HomePage",
  },
  {
    selector: '[data-tour-id="menu-ideation-space"]',
    title: "Ideation Space",
    content:
      "This is the heart of the platform. Click here to view, create, and collaborate on ideas.",
    path: "HomePage",
  },
  {
    selector: '[data-tour-id="ideation-space-share-idea"]',
    title: "Share Your Ideas",
    content:
      "Click this button to share a new idea or build upon existing ones you've selected.",
    path: "IdeationSpace",
  },
  {
    selector: '[data-tour-id="ideation-space-filters"]',
    title: "Filter & Sort",
    content:
      "Use these dropdowns to filter ideas based on your activity or by the specific sub-challenge.",
    path: "IdeationSpace",
  },
  {
    selector: '[data-tour-id="idea-tile-example"]',
    title: "Idea Cards",
    content:
      "Each card represents an idea. You can expand it to read more, evaluate it, comment, and select it to build upon.",
    path: "IdeationSpace",
  },
  {
    selector: '[data-tour-id="menu-idea-assessments"]',
    title: "Idea Assessments",
    content:
      "Next, let's check out the assessment view. This page gives you a portfolio view of all evaluated ideas.",
    path: "IdeationSpace",
  },
  {
    selector: '[data-tour-id="assessment-chart"]',
    title: "Impact vs. Feasibility Chart",
    content:
      "This chart plots all evaluated ideas based on their average impact and feasibility scores. The most promising ideas appear in the top-right.",
    path: "IdeaAssessments",
  },
  {
    selector: '[data-tour-id="menu-player-ranking"]',
    title: "Player Rankings",
    content:
      "See how you stack up against your colleagues! This page shows the leaderboard based on contributions.",
    path: "IdeaAssessments",
  },
  {
    selector: '[data-tour-id="ranking-table"]',
    title: "The Leaderboard",
    content:
      "This table ranks all participants by their Experience Points (XP). You can sort by any column to see who is leading in different categories.",
    path: "PlayerRankingView",
  },
  {
    selector: '[data-tour-id="menu-player-dashboard"]',
    title: "Your Dashboard",
    content: "Finally, let's look at your personal activity dashboard.",
    path: "PlayerRankingView",
  },
  {
    selector: '[data-tour-id="player-dashboard-stats"]',
    title: "Your Personal Stats",
    content:
      "Here you can see a summary of all your contributions and track your daily activity over the past week. You can also change your profile picture here.",
    path: "PlayerPageView",
  },
  {
    selector: "body",
    title: "Tour Complete!",
    content:
      "You're now ready to explore the platform. Jump in, share your ideas, and let's innovate together!",
    path: "PlayerPageView",
  },
];
