import { isTheSameDay } from "./date.js";

export function initEventStore() {
  document.addEventListener("event-create", (event) => {
    let createdEvent = event.detail.event;

    // Ensure event date is always in local time
    const localDate = new Date(createdEvent.date);
    createdEvent.date = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate() + 1, //forces to local date
        0, 0, 0 // Force midnight local time
    );

    const events = getEventsFromLocalStorage();
    events.push(createdEvent);
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("events-change", { bubbles: true }));
});


  document.addEventListener("event-delete", (event) => {
    const deletedEvent = event.detail.event;
    const events = getEventsFromLocalStorage().filter((event) => {
      return event.id !== deletedEvent.id;
    })
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("events-change", {
      bubbles: true
    }));
  });

  document.addEventListener("event-edit", (event) => {
    const editedEvent = event.detail.event;
    const events = getEventsFromLocalStorage().map((event) => {
      return event.id === editedEvent.id ? editedEvent : event;
    });
    saveEventsIntoLocalStorage(events);

    document.dispatchEvent(new CustomEvent("events-change", {
      bubbles: true
    }));
  });

  return {
    getEventsByDate(date) {
      const events = getEventsFromLocalStorage();
      const filteredEvents = events.filter((event) => isTheSameDay(event.date, date));

      return filteredEvents;
    }
  };
}

function saveEventsIntoLocalStorage(events) {
  const safeToStringifyEvents = events.map((event) => ({
    ...event,
    date: new Date(
        event.date.getFullYear(),
        event.date.getMonth(),
        event.date.getDate(), 
        0, 0, 0 // Normalize to midnight
    ).getTime() // Store as timestamp
}));


localStorage.setItem("events", JSON.stringify(safeToStringifyEvents));
}

function getEventsFromLocalStorage() {
  const localStorageEvents = localStorage.getItem("events");
    if (!localStorageEvents) return [];

    const parsedEvents = JSON.parse(localStorageEvents);
    return parsedEvents.map((event) => {
        const eventDate = new Date(event.date); // Convert timestamp back to local date

        return {
            ...event,
            date: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 0, 0, 0) // Force local time
        };
    });
}