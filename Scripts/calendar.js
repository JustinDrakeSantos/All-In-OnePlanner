import { today } from "./date.js"
import { initMonthCalendar } from "./monthCalendar.js";
import { initWeekCalendar } from "./weekCalendar.js";

export function initCalendar(eventStore) {
    const calendarElement = document.querySelector("[data-calendar]");

    let selectedView = "month";
    let selectedDate = today();

    function refreshCalendar() {
        calendarElement.replaceChildren();

        if (selectedView === "month") {
            initMonthCalendar(calendarElement, selectedDate, eventStore);
        } else if (selectedView === "week") {
            initWeekCalendar(calendarElement, selectedDate, eventStore, false);
        } else {
            initWeekCalendar(calendarElement, selectedDate, eventStore, true);
        }
    }

    document.addEventListener("view-change", (event) => {
            selectedView = event.detail.view;
            refreshCalendar();
    });

    document.addEventListener("date-change", (event) => {
        selectedDate = event.detail.date;
        refreshCalendar();
    });

    document.addEventListener("events-change", () => {
        refreshCalendar();
    });

    refreshCalendar();
}