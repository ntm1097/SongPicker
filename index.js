fetch("./components/navbar.html")
  .then((response) => response.text())
  .then((data) => {
    document.body.insertAdjacentHTML("afterbegin", data);
  });

document.addEventListener("DOMContentLoaded", function () {
  const dateInput = document.querySelector(".input__date");
  const songInputs = document.querySelectorAll(".song__input");
  const submitBtn = document.querySelectorAll(".btn")[1]; // Second button is "Submit"

  if (dateInput && songInputs.length === 5 && submitBtn) {
    submitBtn.addEventListener("click", async function () {
      const date = dateInput.value;
      const songs = Array.from(songInputs)
        .map((input) => input.value.trim())
        .filter(Boolean);

      if (!date || songs.length !== 5) {
        const answer = prompt("Were 5 songs done this week? (yes/No)");
        if (answer && answer.toLowerCase() === "no" && !!date) {
          try {
            await db.collection("weeks").add({
              date: date,
              songs: songs,
            });
            const batch = db.batch();
            songs.forEach((song) => {
              const songRef = db.collection("songs").doc(song);
              batch.set(
                songRef,
                { count: firebase.firestore.FieldValue.increment(1) },
                { merge: true }
              );
            });
            await batch.commit();
            alert("Songs submitted");
            dateInput.value = "";
            songInputs.forEach((input) => (input.value = ""));
          } catch (error) {
            console.error("Error saving week or updating counts:", error);
            alert("Error saving data.");
          }
        } else {
          alert("Make sure date is filled in please");
        }
        return; // Prevents double submission
      }

      // Only runs if all fields are valid
      try {
        await db.collection("weeks").add({
          date: date,
          songs: songs,
        });
        const batch = db.batch();
        songs.forEach((song) => {
          const songRef = db.collection("songs").doc(song);
          batch.set(
            songRef,
            { count: firebase.firestore.FieldValue.increment(1) },
            { merge: true }
          );
        });
        await batch.commit();
        alert("Songs submitted");
        dateInput.value = "";
        songInputs.forEach((input) => (input.value = ""));
      } catch (error) {
        console.error("Error saving week or updating counts:", error);
        alert("Error saving data.");
      }
    });
  }
});