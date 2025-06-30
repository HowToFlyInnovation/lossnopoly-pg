/*
This is an altered file: src/pages/privatePages/views/AdminView.tsx
*/
import React, { useState, useEffect, useContext } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AuthContext } from "../../context/AuthContext";

interface Player {
  email: string;
  displayName: string;
}

const AdminView: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext)!;

  useEffect(() => {
    const fetchPlayers = async () => {
      if (
        user?.email === "chevalier.j@pg.com" ||
        user?.email === "gilles.rossou@howtofly.be" ||
        user?.email === "j.judd@kineticc.com"
      ) {
        try {
          const playersSnapshot = await getDocs(collection(db, "players"));
          const playersList = playersSnapshot.docs.map(
            (doc) => doc.data() as Player
          );
          setPlayers(playersList);
        } catch (error) {
          console.error("Error fetching players:", error);
        }
      }
      setLoading(false);
    };

    fetchPlayers();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (
    user?.email !== "chevalier.j@pg.com" &&
    user?.email !== "gilles.rossou@howtofly.be" &&
    user?.email !== "j.judd@kineticc.com"
  ) {
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
