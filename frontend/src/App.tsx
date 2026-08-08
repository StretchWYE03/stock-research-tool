import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Backtest from "./pages/Backtest";
import Dashboard from "./pages/Dashboard";
import Disclaimer from "./pages/Disclaimer";
import Learn from "./pages/Learn";
import Paper from "./pages/Paper";
import Screener from "./pages/Screener";
import Stock from "./pages/Stock";
import Watchlist from "./pages/Watchlist";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route index element={<Dashboard />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/paper" element={<Paper />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/stock/:symbol" element={<Stock />} />
      </Route>
    </Routes>
  );
}
