import { initViewSelect } from "./viewselect.js"
import { initCalendar } from "./calendar.js";
import { initEventCreateButton } from "./eventCreateButton.js";
import { initEventFormDialog } from "./eventFormDialog.js";
import { initNav } from "./nav.js";
import { initNotifications } from "./notifications.js";
import { initEventStore } from "./eventStore.js";

const eventStore = initEventStore();
initCalendar(eventStore);
initEventCreateButton();
initEventFormDialog();
initNav();
initNotifications();
initViewSelect();