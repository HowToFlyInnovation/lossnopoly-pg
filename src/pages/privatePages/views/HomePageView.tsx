// src/pages/privatePages/views/HomePageView.tsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { db } from "../../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";
import {
  FaLightbulb,
  FaRocket,
  FaBullseye,
  FaComments,
  FaArrowRight,
  FaQuestionCircle,
  FaPlay,
} from "react-icons/fa";
import { costImpactToMonetaryValue } from "../../../lib/constants";

// --- TYPE DEFINITIONS ---
interface HomePageViewProps {
  handleMissionClick: (contentId: string) => void;
  handleSignOut: () => void;
  onStartTour: () => void;
}

interface Challenge {
  id: string;
  emoji: string;
  title: string;
  shortDescription: string;
  fullContent: {
    intro: string;
    paragraphs: string[];
    listTitle?: string;
    list?: string[];
    challenge: string;
  };
}

interface Idea {
  id: string;
  shortDescription: string;
  ideationMission: string;
  imageUrl?: string;
  ideaNumber?: number;
  outOfScope?: boolean;
  isNew?: boolean; // Added isNew field
}

interface Evaluation {
  ideaId: string;
  ImpactScore: string;
  FeasibilityScore: string;
}

const TARGET_SAVINGS_MILLIONS = 25;
const TARGET_SAVINGS_VALUE = TARGET_SAVINGS_MILLIONS * 1_000_000;

const feasibilityToRiskAdjustment: { [key: string]: number } = {
  "Very Easy To do": 0.9,
  Manageable: 0.7,
  "Achievable with Effort": 0.5,
  Challenging: 0.25,
  "Very Challenging": 0.1,
};

// --- ASSET URLS ---
const chrisTopHatVideo =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/ChrisPlatformWelcomeVideo.mp4?alt=media&token=1db5159a-9af5-4b5a-8a0c-af9807d1fd44";
const chrisTopHatThumbnail =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/ChristStartingImageJailComputer.png?alt=media&token=0c04611d-9ba5-4521-be8c-921c62aa6cb3";
const monopolyJailImage =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/ChrisOutOfJail_Updated.png?alt=media&token=82021c46-b346-43d7-a98f-4433c7d63fe8";
const goalReachedVideo =
  "https://firebasestorage.googleapis.com/v0/b/lossnopoly-hc.firebasestorage.app/o/ChrisOutOfJailVideo%20(1).mp4?alt=media&token=8d35441b-3306-4d66-baff-97f2b37796bd";

// --- SUB-COMPONENTS ---

const HowItWorksCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-gray-50 rounded-lg p-6 flex items-start space-x-4 h-full">
    <div className="flex-shrink-0 text-2xl text-monopoly-red-darker">
      {icon}
    </div>
    <div>
      <h4 className="text-lg font-bold text-gray-800">{title}</h4>
      <p className="text-gray-600">{children}</p>
    </div>
  </div>
);

// --- HOME PAGE VIEW COMPONENT ---
const HomePageView: React.FC<HomePageViewProps> = ({
  handleMissionClick,
  onStartTour,
}) => {
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: "supply-chain",
      emoji: "🏗️",
      title: "TOUCHLESS SUPPLY CHAIN",
      shortDescription:
        "How can we reduce 50% of the touches in our supply chain from the complete process of producing goods, from sourcing raw materials to delivering the finished product to customers?",
      fullContent: {
        intro:
          "How can we reduce 50% of the touches in our supply chain from the complete process of producing goods, from sourcing raw materials to delivering the finished product to customers?",
        paragraphs: [
          "Whether you’re in a Plant or working with a Contract Manufacturer, in Operations or non-Operations, this is about making every step smoother, smarter and faster. We’re looking for ways to remove unnecessary work, reduce handoffs, and reimagine how things get done (think automation or digital tools), to boldly questioning whether certain steps need to exist at all.",
          "Because fewer touches mean fewer time demands, lower costs and more time for what really matters.",
        ],
        challenge:
          "Help reimagine how things get done, from raw materials arriving to finished products shipping out. No touch is off the table.",
      },
    },
    {
      id: "innovation",
      emoji: "🚀",
      title: "TOUCHLESS INNOVATION",
      shortDescription:
        "How can we reduce 50% of the effort it takes to launch something new including reducing our GMC costs by 50%?",
      fullContent: {
        intro:
          "How can we reduce 50% of the effort it takes to launch something new including reducing our GMC costs by 50%?",
        paragraphs: [
          "From product concept to qualification, there's a LOT that goes into every new initiative. With the upcoming Initiative masterplan including 3D and Formula restages, we will place pressure on on our resources, capacity, and costs, but what if we could make it all simpler, faster and more efficient, without compromising quality?",
        ],
        listTitle: "We’re looking for ideas that:",
        list: [
          "Redesign workflows for fewer touches or rework",
          "Automate manual steps (like master data, base plan or artwork processes)",
          "Enable alternatives to online development and testing that eliminates the need for expensive full-scale qualifications",
        ],
        challenge:
          "Help us build a launch engine that runs lean; optimising our processes and methods to streamline our initiatives minimising impact on resources, capacity and cost.",
      },
    },
    {
      id: "zero-waste",
      emoji: "♻️",
      title: "ZERO WASTE CHALLENGE",
      shortDescription:
        "How can we reduce 50% of the materials we waste in production?",
      fullContent: {
        intro: "How can we reduce 50% of the materials we waste in production?",
        paragraphs: [
          "Whether it’s scraps on the line, changeover, or processes losses, we know there’s gold hiding in our waste bins. What if we could halve that? Where are the hidden wins in our equipment, our processes or operating strategies to make it happen.",
          "We're not just aiming for tweaks, we’re looking for breakthrough ideas that reduce material use at every site, from our company sites to contract manufacturers.", // Generic fallback
        ],
        challenge:
          "Help us use less, waste less, maximise value from any waste that can’t be eliminated.",
      },
    },
  ]);
  const [totalIdentifiedSavings, setTotalIdentifiedSavings] =
    useState<number>(0);
  const [numberOfIdeasWithEvaluations, setNumberOfIdeasWithEvaluations] =
    useState<number>(0);
  const [averageMonetaryValuePerIdea, setAverageMonetaryValuePerIdea] =
    useState<number>(0);
  const [loadingSavings, setLoadingSavings] = useState(true);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isGoalVideoPlaying, setIsGoalVideoPlaying] = useState(false);
  const [closeIdeaSharingDate, setCloseIdeaSharingDate] = useState<Date | null>(
    null
  );
  const [closeCommentingDate, setCloseCommentingDate] = useState<Date | null>(
    null
  );
  const [closeEvaluationDate, setCloseEvaluationDate] = useState<Date | null>(
    null
  );

  const { user } = useContext(AuthContext) as AuthContextType;
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(
    null
  );

  const savingsTrackerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const goalVideoRef = useRef<HTMLVideoElement>(null);

  const now = new Date();
  const isIdeaSharingEnded = closeIdeaSharingDate
    ? now > closeIdeaSharingDate
    : false;
  const isCommentingEnded = closeCommentingDate
    ? now > closeCommentingDate
    : false;
  const isEvaluationEnded = closeEvaluationDate
    ? now > closeEvaluationDate
    : false;

  const handlePlayButtonClick = () => {
    const video = videoRef.current;
    if (video) {
      video.play();
      setIsVideoPlaying(true);
    }
  };

  const handleVideoPlayPause = () => {
    if (videoRef.current) {
      setIsVideoPlaying(!videoRef.current.paused);
    }
  };

  const handleGoalVideoPlayButtonClick = () => {
    const video = goalVideoRef.current;
    if (video) {
      video.play();
      setIsGoalVideoPlaying(true);
    }
  };

  const handleGoalVideoPlayPause = () => {
    if (goalVideoRef.current) {
      setIsGoalVideoPlaying(!goalVideoRef.current.paused);
    }
  };

  const handleScrollToTracker = () => {
    savingsTrackerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleChallengeClick = (id: string) => {
    setExpandedChallengeId(id);
  };

  useEffect(() => {
    const fetchClosingDates = async () => {
      const datesToFetch = [
        "CloseIdeaSharingDate",
        "CloseCommentingDate",
        "CloseEvaluationDate",
      ];
      const dateSetters: { [key: string]: (date: Date) => void } = {
        CloseIdeaSharingDate: setCloseIdeaSharingDate,
        CloseCommentingDate: setCloseCommentingDate,
        CloseEvaluationDate: setCloseEvaluationDate,
      };

      for (const dateName of datesToFetch) {
        const docRef = doc(db, "closingDates", dateName);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          dateSetters[dateName](docSnap.data().date.toDate());
        }
      }
    };
    fetchClosingDates();
  }, []);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (user) {
        const playerDocRef = doc(db, "players", user.uid);
        try {
          const playerDocSnap = await getDoc(playerDocRef);
          if (playerDocSnap.exists()) {
            setPlayerName(playerDocSnap.data().displayName || "TopHat");
          } else {
            setPlayerName(user.displayName || "TopHat");
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
          setPlayerName(user.displayName || "TopHat");
        }
      }
    };

    fetchPlayerData();
  }, [user]);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const challengeInfoCollection = collection(db, "challengeInfo");
        const challengeInfoSnapshot = await getDocs(challengeInfoCollection);
        if (!challengeInfoSnapshot.empty) {
          const companyDoc = challengeInfoSnapshot.docs[0];
          const companyData = companyDoc.data();
          if (companyData.company) {
            setCompanyName(companyData.company);
          }
        }
      } catch (error) {
        console.error(
          "Failed to fetch company info (likely due to permissions):",
          error
        );
        setCompanyName(null); // Explicitly set to null on failure
      }
    };

    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (companyName) {
      setChallenges((prevChallenges) =>
        prevChallenges.map((challenge) => {
          if (challenge.id === "zero-waste") {
            return {
              ...challenge,
              fullContent: {
                ...challenge.fullContent,
                paragraphs: [
                  "Whether it’s scraps on the line, changeover, or processes losses, we know there’s gold hiding in our waste bins. What if we could halve that? Where are the hidden wins in our equipment, our processes or operating strategies to make it happen.",
                  `We're not just aiming for tweaks, we’re looking for breakthrough ideas that reduce material use at every site, from ${companyName} sites to contract manufacturers.`,
                ],
              },
            };
          }
          return challenge;
        })
      );
    }
  }, [companyName]);

  useEffect(() => {
    const calculateTotalSavings = async () => {
      setLoadingSavings(true);
      try {
        const [ideasSnapshot, evaluationsSnapshot] = await Promise.all([
          getDocs(collection(db, "ideas")),
          getDocs(collection(db, "evaluations")),
        ]);

        const ideas = ideasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Idea[];
        const evaluations = evaluationsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ideaId: data.ideaId as string,
            ImpactScore: data.ImpactScore as string,
            FeasibilityScore: data.FeasibilityScore as string,
          };
        }) as Evaluation[];

        const evaluationsByIdea: { [ideaId: string]: Evaluation[] } = {};
        evaluations.forEach((evalItem) => {
          if (!evaluationsByIdea[evalItem.ideaId]) {
            evaluationsByIdea[evalItem.ideaId] = [];
          }
          evaluationsByIdea[evalItem.ideaId].push(evalItem);
        });

        let totalSavings = 0;
        let ideasContributing = 0;

        ideas.forEach((idea) => {
          // Skip out-of-scope ideas unless they are marked as new
          if (idea.outOfScope && !idea.isNew) {
            return;
          }

          const ideaEvaluations = evaluationsByIdea[idea.id] || [];
          if (ideaEvaluations.length > 0) {
            let sumRiskAdjustedValue = 0;
            ideaEvaluations.forEach((evalItem) => {
              const monetaryValue =
                costImpactToMonetaryValue[evalItem.ImpactScore] || 0;
              const riskAdjustment =
                feasibilityToRiskAdjustment[evalItem.FeasibilityScore] || 0;
              const riskAdjustedValue = monetaryValue * riskAdjustment;

              if (riskAdjustedValue !== undefined) {
                sumRiskAdjustedValue += riskAdjustedValue;
              }
            });
            const averageRiskAdjustedValue =
              sumRiskAdjustedValue / ideaEvaluations.length;
            totalSavings += averageRiskAdjustedValue;
            ideasContributing++;
          }
        });
        setTotalIdentifiedSavings(totalSavings);
        setNumberOfIdeasWithEvaluations(ideasContributing);

        let avgMonetaryPerIdea = 0;
        if (ideasContributing > 0) {
          avgMonetaryPerIdea = totalSavings / ideasContributing;
        }
        setAverageMonetaryValuePerIdea(avgMonetaryPerIdea);
      } catch (error) {
        console.error("Error calculating total savings:", error);
        setTotalIdentifiedSavings(0);
        setNumberOfIdeasWithEvaluations(0);
        setAverageMonetaryValuePerIdea(0);
      } finally {
        setLoadingSavings(false);
      }
    };
    calculateTotalSavings();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDisclaimerMessage = () => {
    if (isEvaluationEnded) {
      return "The game has ended. Thank you for your participation! You can still browse all the great ideas.";
    }
    if (isCommentingEnded) {
      return "The commenting period has closed. You can no longer share comments, but you can still evaluate ideas.";
    }
    if (isIdeaSharingEnded) {
      return "The idea sharing period has ended. You can still comment on and evaluate existing ideas.";
    }
    return null;
  };

  const disclaimerMessage = getDisclaimerMessage();

  const progressPercentage = Math.min(
    (totalIdentifiedSavings / TARGET_SAVINGS_VALUE) * 100,
    100
  );

  const goalReached = progressPercentage >= 100;

  const expandedChallenge =
    challenges.find((c) => c.id === expandedChallengeId) || null;
  const compactChallenges =
    challenges.filter((c) => c.id !== expandedChallengeId) || [];

  return (
    <div className="bg-gray-100 min-h-screen">
      <header
        data-tour-id="home-welcome"
        className="text-center relative px-5 pt-20 pb-12 bg-white shadow-md"
      >
        {disclaimerMessage && (
          <div className="bg-red-500 text-white font-bold text-center p-4 mb-6">
            {disclaimerMessage}
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
          Welcome, {playerName || "TopHat"}!
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">
          Every great game starts with one bold move. Your ideas are the key to
          unlocking the next generation of savings. Let's play to win, together.
        </p>
      </header>

      <main className="p-8 md:p-12 bg-monopoly-green-light">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-16">
            <div className="text-left bg-white p-8 rounded-lg shadow-md">
              <p className="text-gray-700 mb-6">
                You've been hand-picked to collaborate with your European and
                Global colleagues to turn fresh thinking into feasible ideas
                that fuel growth and ensure sufficient savings over the next 3
                years.
              </p>
              <button
                onClick={onStartTour}
                className="text-monopoly-red font-bold flex items-center gap-2 mb-4 hover:underline"
              >
                <FaArrowRight /> Take the GUIDED TOUR to explore the platform
              </button>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={handleScrollToTracker}
                  className="text-monopoly-red font-bold flex items-center gap-2 hover:underline text-left"
                >
                  <FaArrowRight />
                  <div>
                    <span>Been here before? </span>
                    <span className="underline">Jump to Savings Tracker.</span>
                    <br />
                    <span>Are we close enough to break Chris out yet!?</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="relative flex justify-center items-center">
              <video
                ref={videoRef}
                src={chrisTopHatVideo}
                poster={chrisTopHatThumbnail}
                playsInline
                controls
                className="rounded-lg shadow-lg max-w-full h-auto"
                onPlay={handleVideoPlayPause}
                onPause={handleVideoPlayPause}
              ></video>
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none">
                  <button
                    onClick={handlePlayButtonClick}
                    className="pointer-events-auto p-4"
                    aria-label="Play video"
                  >
                    <FaPlay className="text-white text-6xl drop-shadow-lg" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Our Three High Stakes Challenges
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto mb-8">
              What could be simpler, smarter... or skipped entirely? These 3
              challenges are here to focus your thinking and unlock new
              possibilities. Where do you see hidden potential, or a chance to
              do things differently?
            </p>
            <div className="flex flex-col md:flex-row gap-8">
              {expandedChallenge ? (
                <>
                  <div className="w-full md:w-3/4">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-8 text-left h-full flex flex-col">
                      <div className="flex justify-between items-start">
                        <span className="text-6xl mb-4">
                          {expandedChallenge.emoji}
                        </span>
                        <button
                          onClick={() => handleChallengeClick("")}
                          className="text-sm text-gray-500 text-bold hover:text-gray-800 cursor-pointer"
                        >
                          <b>Read Less X </b>
                        </button>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4 uppercase">
                        {expandedChallenge.title}
                      </h3>
                      <div className="text-base text-gray-600 space-y-4">
                        <p className="font-semibold text-gray-700">
                          {expandedChallenge.fullContent.intro}
                        </p>
                        {expandedChallenge.fullContent.paragraphs.map(
                          (p, i) => (
                            <p key={i}>{p}</p>
                          )
                        )}
                        {expandedChallenge.fullContent.listTitle && (
                          <h4 className="font-bold text-gray-700 pt-2">
                            {expandedChallenge.fullContent.listTitle}
                          </h4>
                        )}
                        {expandedChallenge.fullContent.list && (
                          <ul className="list-disc list-inside space-y-1">
                            {expandedChallenge.fullContent.list.map(
                              (item, i) => (
                                <li key={i}>{item}</li>
                              )
                            )}
                          </ul>
                        )}
                        <h4 className="font-bold text-gray-700 pt-2">
                          Your Challenge:
                        </h4>
                        <p>{expandedChallenge.fullContent.challenge}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-1/4 flex flex-col gap-8">
                    {compactChallenges.map((challenge) => (
                      <div
                        key={challenge.id}
                        onClick={() => handleChallengeClick(challenge.id)}
                        className="bg-white border border-gray-200 rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center cursor-pointer h-full"
                      >
                        <span className="text-5xl mb-3">{challenge.emoji}</span>
                        <h3 className="text-lg font-bold text-gray-800 uppercase">
                          {challenge.title}
                        </h3>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                challenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="w-full md:w-1/3 flex"
                    onClick={() => handleChallengeClick(challenge.id)}
                  >
                    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 text-center hover:shadow-xl transition-shadow duration-300 flex flex-col items-center h-full cursor-pointer">
                      <span className="text-5xl mb-4">{challenge.emoji}</span>
                      <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">
                        {challenge.title}
                      </h3>
                      <p className="text-base text-gray-600 flex-grow">
                        {challenge.shortDescription}
                      </p>
                      <button className="text-monopoly-red-darker font-semibold mt-4 cursor-pointer">
                        Read More
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-center mb-16 bg-white p-12 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              How to Participate?
            </h2>
            <p className="text-gray-600 max-w-4xl mx-auto mb-8">
              Navigate using the side menu to explore the platform. Your main
              hub is the <strong>Ideation Space</strong>, where you can
              contribute in three key ways.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HowItWorksCard icon={<FaLightbulb />} title="Ideate">
                Submit your innovative solutions. Big or small, every idea has
                the potential to make a huge impact.
                <br />
                <em className="text-sm">Remember it's anonymous.</em>
              </HowItWorksCard>
              <HowItWorksCard icon={<FaBullseye />} title="Evaluate">
                Assess ideas from your colleagues on their impact and
                feasibility. Your perspective is crucial for identifying top
                solutions.
              </HowItWorksCard>
              <HowItWorksCard icon={<FaComments />} title="Collaborate">
                Comment, ask questions, and build upon the ideas of others by
                combining them. Collaboration is the key to creating and shaping
                great ideas.
              </HowItWorksCard>
            </div>
            <button
              onClick={() => handleMissionClick("IdeationSpace")}
              className="mt-8 py-3 px-8 bg-monopoly-red-darker text-white font-bold text-lg rounded-lg shadow-lg hover:bg-monopoly-red focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 flex items-center mx-auto"
            >
              <FaRocket className="mr-3" />
              Go to the Ideation Space
            </button>
          </div>

          <div
            ref={savingsTrackerRef}
            id="savings-tracker"
            className="text-center bg-white p-6 lg:p-12 rounded-lg shadow-lg"
          >
            <div className="relative flex items-center justify-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">
                Total Identified Annual Savings
              </h2>
              <button
                onClick={() => setIsInfoVisible(!isInfoVisible)}
                className="absolute -right-3 top-1/6 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label="Show calculation info"
              >
                <FaQuestionCircle size={24} />
              </button>
              {isInfoVisible && (
                <div className="absolute top-full right-0 mt-2 w-[100%] md:w-[70%] lg:w-[60%] xl:-w-[50%] bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-10 text-left">
                  <h4 className="font-bold text-sm mb-2">
                    How is this calculated?
                  </h4>
                  <p className="text-xs text-gray-600">
                    This is a <b>risk-adjusted</b> forecast.
                    <br />
                    The savings from each evaluation are weighted by a risk
                    factor based on its feasibility.
                  </p>
                  <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-1">
                    <li>
                      An idea's monetary value is multiplied by a risk factor:
                      <ul className="list-disc list-inside pl-4 mt-1">
                        <li>
                          <strong>Very Challenging:</strong> 10%
                        </li>
                        <li>
                          <strong>Challenging:</strong> 25%
                        </li>
                        <li>
                          <strong>Achievable with Effort:</strong> 50%
                        </li>
                        <li>
                          <strong>Manageable:</strong> 70%
                        </li>
                        <li>
                          <strong>Very Easy To Do:</strong> 90%
                        </li>
                      </ul>
                    </li>
                    <li>
                      We average these risk-adjusted values for each idea.{" "}
                      <br />
                      <b>
                        So e.g. the average cost saving estimate is $500K and
                        the average Feasibility is Achievable, the value taken
                        into account from that idea will be $500k*0.5 = $250K.
                      </b>
                    </li>
                    <li>
                      The total is the sum of these averages for all evaluated
                      ideas.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center">
              {goalReached ? (
                <div className="relative flex justify-center items-center w-80 h-auto mb-6">
                  <video
                    ref={goalVideoRef}
                    src={goalReachedVideo}
                    playsInline
                    controls
                    className="w-full h-full rounded-lg"
                    onPlay={handleGoalVideoPlayPause}
                    onPause={handleGoalVideoPlayPause}
                  ></video>
                  {!isGoalVideoPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none">
                      <button
                        onClick={handleGoalVideoPlayButtonClick}
                        className="pointer-events-auto p-4"
                        aria-label="Play video"
                      >
                        <FaPlay className="text-white text-4xl drop-shadow-lg" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={monopolyJailImage}
                  alt="Mr. Monopoly in jail"
                  className="w-48 h-auto mb-6"
                />
              )}
              {loadingSavings ? (
                <p className="text-gray-600">Calculating savings...</p>
              ) : (
                <div className="w-full max-w-3xl">
                  <div className="bg-gray-200 rounded-full h-4 relative">
                    <div
                      className={`${
                        goalReached ? "bg-green-500" : "bg-monopoly-red"
                      } h-4 rounded-full`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0</span>
                    <span>$5MM</span>
                    <span>$10MM</span>
                    <span>$15MM</span>
                    <span>$20MM</span>
                    <span>$25MM</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mt-4">
                    Current Identified Savings:{" "}
                    <strong>{formatCurrency(totalIdentifiedSavings)}</strong>{" "}
                    (Target: {formatCurrency(TARGET_SAVINGS_VALUE)})
                  </p>
                  {numberOfIdeasWithEvaluations > 0 && (
                    <p className="text-md text-gray-600 mt-2">
                      This is based on{" "}
                      <strong>{numberOfIdeasWithEvaluations}</strong> ideas with
                      an average risk-adjusted saving of{" "}
                      <strong>
                        {formatCurrency(averageMonetaryValuePerIdea)}
                      </strong>{" "}
                      per idea.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePageView;
