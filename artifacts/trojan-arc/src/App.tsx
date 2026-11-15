import Home from "@/pages/home";
import { StoreProvider } from "@/lib/store";
import { CalendarProvider } from "@/lib/calendar";

export default function App() {
  return (
    <>
      <div className="ambient" aria-hidden />
      <StoreProvider>
        <CalendarProvider><Home /></CalendarProvider>
      </StoreProvider>
    </>
  );
}
