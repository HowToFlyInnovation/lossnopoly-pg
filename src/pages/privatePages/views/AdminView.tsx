import React, { useState, useEffect, useContext } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext, type AuthContextType } from "../../context/AuthContext";

interface Player {
  email: string;
  displayName: string;
}

interface PlayerDetails {
  adminRights?: boolean;
}

const AdminView: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useContext(AuthContext) as AuthContextType;

  useEffect(() => {
    const checkAdminRights = async () => {
      if (user) {
        try {
          const playerDetailsQuery = query(
            collection(db, "playerDetailsCollection"),
            where("email", "==", user.email)
          );
          const querySnapshot = await getDocs(playerDetailsQuery);

          if (!querySnapshot.empty) {
            const playerDetailsDoc = querySnapshot.docs[0];
            const playerData = playerDetailsDoc.data() as PlayerDetails;

            if (playerData.adminRights === true) {
              setIsAdmin(true);
              const playersSnapshot = await getDocs(collection(db, "players"));
              const playersList = playersSnapshot.docs.map(
                (doc) => doc.data() as Player
              );
              setPlayers(playersList);
            }
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
        }
      }
      setLoading(false);
    };

    checkAdminRights();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <div>You are not authorized to view this page.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Registered Users ({players.length})
      </h1>
      <ul>
        {players.map((player) => (
          <li key={player.email}>{player.email}</li>
        ))}
      </ul>
    </div>
  );
};

export default AdminView;
