import { Link, Route, Routes } from "react-router-dom";
import Architecture from "./pages/Architecture";
import Home from "./pages/Home";
import NoteDetail from "./pages/NoteDetail";

function App() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-800 px-4 py-3 flex justify-between max-w-3xl mx-auto">
        <Link to="/" className="font-medium">
          Audio Notes
        </Link>
        <Link to="/architecture" className="text-slate-400 hover:text-slate-200 text-sm">
          architecture
        </Link>
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
