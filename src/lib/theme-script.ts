/** localStorage key for the light / dark / system preference. */
export const THEME_STORAGE_KEY = "aip-theme";

/**
 * Runs in <head> before the first paint: applies the saved theme, or the
 * system setting when none is saved, as data-theme on <html>.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,p;try{p=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var dark=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.setAttribute("data-theme",dark?"dark":"light")})()`;
