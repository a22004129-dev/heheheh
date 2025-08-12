const API_BASE = "http://localhost:3000";

document.getElementById("uploadForm").addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch(API_BASE + "/upload", {
    method: "POST",
    body: formData
  });
  const json = await res.json();
  document.getElementById("output").innerHTML = JSON.stringify(json, null, 2);
});
