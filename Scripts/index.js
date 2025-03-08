let container = document.querySelector(".planner-page-greeting");
let timeNow = 9;

let greeting = timeNow >= 5 && timeNow < 12 ? "Good Morning" 
: timeNow >= 12 && timeNow < 18 ? "Good Afternoon" 
: "Good Evening";

container.innerHTML = `<h1>${greeting}<h1>`;