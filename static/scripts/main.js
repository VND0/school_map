const openBtn = document.querySelector("#openBtn");
const modal = document.querySelector("#testModal");
const closeBtn = document.querySelector("#closeBtn");

openBtn.onclick = () => modal.classList.remove("hidden")
closeBtn.onclick = () => modal.classList.add("hidden")