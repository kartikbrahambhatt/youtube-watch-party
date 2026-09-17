import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Home";
import WatchRoom from "./pages/WatchRoom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/room/:roomId"
          element={<WatchRoom />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;