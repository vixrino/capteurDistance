import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import GameHub from "@/pages/games/GameHub";
import GuessGame from "@/pages/games/GuessGame";
import StabilityGame from "@/pages/games/StabilityGame";
import ReflexGame from "@/pages/games/ReflexGame";
import MaestroGame from "@/pages/games/MaestroGame";
import MorseGame from "@/pages/games/MorseGame";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/games" element={<GameHub />} />
          <Route path="/games/guess" element={<GuessGame />} />
          <Route path="/games/stability" element={<StabilityGame />} />
          <Route path="/games/reflex" element={<ReflexGame />} />
          <Route path="/games/maestro" element={<MaestroGame />} />
          <Route path="/games/morse" element={<MorseGame />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
