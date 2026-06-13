import { Routes, Route } from "react-router";
import { RoomProvider } from "@/store/RoomContext";
import Landing from "./pages/Landing";
import Room from "./pages/Room";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <RoomProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </RoomProvider>
  );
}
