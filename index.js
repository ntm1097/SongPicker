fetch("./components/navbar.html")
  .then((response) => response.text())
  .then((data) => {
    document.body.insertAdjacentHTML("afterbegin", data);
  });

// Firestore test: write a document and read it back
db.collection("testCollection")
  .doc("testDoc")
  .set({
    message: "Hello from Firestore!",
  })
  .then(() => {
    console.log("Test document written to Firestore.");
    return db.collection("testCollection").doc("testDoc").get();
  })
  .then((doc) => {
    if (doc.exists) {
      console.log("Read from Firestore:", doc.data());
    } else {
      console.log("No such document!");
    }
  })
  .catch((error) => {
    console.error("Firestore test error:", error);
  });

// Add New Format page logic
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
        alert("Please enter a date and 5 songs.");
        return;
      }

      try {
        // Store week data
        await db.collection("weeks").add({
          date: date,
          songs: songs,
        });

        // Update song play counts
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

        alert("Songs submitted and play counts updated!");
        // Optionally clear inputs
        dateInput.value = "";
        songInputs.forEach((input) => (input.value = ""));
      } catch (error) {
        console.error("Error saving week or updating counts:", error);
        alert("Error saving data.");
      }
    });
  }
});
