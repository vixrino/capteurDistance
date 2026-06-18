import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import GameHub from "@/pages/games/GameHub";
import MaestroGame from "@/pages/games/MaestroGame";
import ScreenSyncGame from "@/pages/games/ScreenSyncGame";
import HangarQuizGame from "@/pages/games/HangarQuizGame";
import CameleonGame from "@/pages/games/CameleonGame";
import VeilleurGame from "@/pages/games/VeilleurGame";

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
          <Route path="/games/maestro" element={<MaestroGame />} />
          <Route path="/games/screen_sync" element={<ScreenSyncGame />} />
          <Route path="/games/color_zone" element={<CameleonGame />} />
          <Route path="/games/state_watch" element={<VeilleurGame />} />
          <Route path="/games/hangar_quiz" element={<HangarQuizGame />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
