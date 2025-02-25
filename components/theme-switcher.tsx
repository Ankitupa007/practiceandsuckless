"use client";

import SunIconNothing from "./icons/sun";
import {useTheme} from "next-themes";
import {useEffect, useState} from "react";
import MoonIconNothing from "./icons/moon";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }


  return (
    <div>
      {theme === "dark" ? (
        <button onClick={() => setTheme("light")} className="bg-black px-3 py-2.5 rounded-xl">
          <SunIconNothing
            color="white"
          />
        </button>
      ) : theme === "light" ? (
        <button onClick={() => setTheme("dark")} className="bg-white px-3 py-3  rounded-xl flex justify-center item-center">
          <MoonIconNothing
            color="black"
          />
        </button>
      ) : null}
    </div>
  );
};

export { ThemeSwitcher };
