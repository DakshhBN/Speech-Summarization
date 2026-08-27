import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { Logo } from "./components/Logo";
import Architecture from "./pages/Architecture";
import Home from "./pages/Home";
import NoteDetail from "./pages/NoteDetail";

function App() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grain" />
      <nav className="border-b border-white/[0.06] px-6 py-4 flex justify-between items-center max-w-4xl mx-auto">
        <Link to="/">
          <Logo />
        </Link>
        <button
          onClick={() => navigate("/architecture")}
          className="glass rounded-full px-4 py-2 text-sm font-medium text-amber-100/80 hover:text-white hover:border-amber-400/40 hover:shadow-[0_0_24px_-8px_rgba(245,165,36,0.55)] transition-all duration-300"
        >
          Architecture
        </button>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notes/:id" element={<NoteDetail />} />
        <Route path="/architecture" element={<Architecture />} />
      </Routes>
    </div>
  );
}

export default App;
