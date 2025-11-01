fetch("./components/navbar.html")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then((data) => {
    document.body.insertAdjacentHTML("afterbegin", data);
  })
  .catch((error) => {
    console.error("Error loading navbar:", error);
    // Fallback: create a simple navbar if the file doesn't exist
    const fallbackNavbar = `
      <nav class="fallback-nav">
        <div class="fallback-nav-content">
          <h1>HPBC Song Picker</h1>
          <div class="subtitle">Song Management System</div>
        </div>
      </nav>
    `;
    document.body.insertAdjacentHTML("afterbegin", fallbackNavbar);
  });

document.addEventListener("DOMContentLoaded", function () {
  const dateInput = document.querySelector(".input__date");
  const songInputs = document.querySelectorAll(".song__input");
  const submitBtn = document.getElementById("submit__button");
  // Autocomplete functionality
  let allSongsForAutocomplete = [];
  let currentActiveInput = null;
  
  async function loadSongsForAutocomplete() {
    try {
      if (typeof db !== "undefined") {
        const songsSnapshot = await db.collection("songs").get();
        allSongsForAutocomplete = songsSnapshot.docs
          .map((doc) => {
            const songData = doc.data();
            return songData.name || doc.id;
          })
          .sort();
        console.log(
          "Loaded songs for autocomplete:",
          allSongsForAutocomplete.length
        );
      }
    } catch (error) {
      console.error("Error loading songs for autocomplete:", error);
    }
  }

  function setupAutocomplete() {
    // Create autocomplete dropdown if it doesn't exist
    if (!document.getElementById("autocomplete__dropdown")) {
      const dropdown = document.createElement("div");
      dropdown.id = "autocomplete__dropdown";
      dropdown.className = "autocomplete__dropdown";
      dropdown.style.display = "none";
      dropdown.innerHTML = '<ul id="autocomplete__list"></ul>';
      document.body.appendChild(dropdown);
    }

    const songInputs = document.querySelectorAll(".song__input");
    const dropdown = document.getElementById("autocomplete__dropdown");
    const dropdownList = document.getElementById("autocomplete__list");

    songInputs.forEach((input) => {
      input.addEventListener("input", function (e) {
        currentActiveInput = this;
        const query = this.value.toLowerCase().trim();

        if (query.length < 2) {
          hideDropdown();
          return;
        }

        const matches = allSongsForAutocomplete
          .filter((song) => song.toLowerCase().includes(query))
          .slice(0, 5);

        if (matches.length > 0) {
          showDropdown(matches, this);
        } else {
          hideDropdown();
        }
      });

      input.addEventListener("blur", function () {
        setTimeout(() => {
          hideDropdown();
        }, 200);
      });

      input.addEventListener("keydown", function (e) {
        const dropdown = document.getElementById("autocomplete__dropdown");
        const suggestions = dropdown.querySelectorAll("li");
        const activeSuggestion = dropdown.querySelector("li.active");
        let activeIndex = Array.from(suggestions).indexOf(activeSuggestion);

        if (e.key === "ArrowDown") {
          e.preventDefault();
          activeIndex =
            activeIndex < suggestions.length - 1 ? activeIndex + 1 : 0;
          updateActiveSuggestion(suggestions, activeIndex);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          activeIndex =
            activeIndex > 0 ? activeIndex - 1 : suggestions.length - 1;
          updateActiveSuggestion(suggestions, activeIndex);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeSuggestion) {
            selectSuggestion(activeSuggestion.textContent, this);
          }
        } else if (e.key === "Escape") {
          hideDropdown();
        }
      });
    });
  }

  function showDropdown(matches, inputElement) {
    const dropdown = document.getElementById("autocomplete__dropdown");
    const dropdownList = document.getElementById("autocomplete__list");

    dropdownList.innerHTML = "";

    matches.forEach((song, index) => {
      const li = document.createElement("li");
      li.textContent = song;
      li.className = index === 0 ? "active" : "";
      li.addEventListener("mousedown", function () {
        selectSuggestion(song, inputElement);
      });
      li.addEventListener("mouseenter", function () {
        updateActiveSuggestion(dropdownList.querySelectorAll("li"), index);
      });
      dropdownList.appendChild(li);
    });

    const rect = inputElement.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.display = "block";
  }

  function hideDropdown() {
    const dropdown = document.getElementById("autocomplete__dropdown");
    if (dropdown) {
      dropdown.style.display = "none";
    }
  }

  function updateActiveSuggestion(suggestions, activeIndex) {
    suggestions.forEach((suggestion, index) => {
      suggestion.className = index === activeIndex ? "active" : "";
    });
  }

  function selectSuggestion(song, inputElement) {
    // Check if the current input has a date format and clean it
    const currentValue = inputElement.value;
    const hasDateFormat = /\(\d{1,2}\/\d{1,2}\/\d{2}\)|\(Never used\)/.test(
      currentValue
    );

    if (hasDateFormat) {
      // If auto-generated with date, preserve the song name but update with selected song
      inputElement.value = song;
    } else {
      inputElement.value = song;
    }

    hideDropdown();
    inputElement.focus();
  }

  // Initialize autocomplete when page loads
  setTimeout(async () => {
    await loadSongsForAutocomplete();
    setupAutocomplete();
  }, 1000); // Wait for Firebase to initialize

  // Calendar utility for date parsing and holiday calculation
  class DateParser {
    constructor(year) {
      this.year = parseInt(year);
      this.monthNames = {
        jan: 0,
        january: 0,
        feb: 1,
        february: 1,
        mar: 2,
        march: 2,
        apr: 3,
        april: 3,
        may: 4,
        jun: 5,
        june: 5,
        jul: 6,
        july: 6,
        aug: 7,
        august: 7,
        sep: 8,
        sept: 8,
        september: 8,
        oct: 9,
        october: 9,
        nov: 10,
        november: 10,
        dec: 11,
        december: 11,
      };
    }

    // Calculate Easter Sunday for the given year
    calculateEaster() {
      const year = this.year;
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const n = Math.floor((h + l - 7 * m + 114) / 31);
      const p = (h + l - 7 * m + 114) % 31;

      return new Date(year, n - 1, p + 1);
    }

    // Get specific holiday dates
    getHolidayDate(holiday) {
      const holidayLower = holiday.toLowerCase().trim();
      const easter = this.calculateEaster();

      const holidays = {
        "new year": new Date(this.year, 0, 1),
        "new years": new Date(this.year, 0, 1),
        "new years day": new Date(this.year, 0, 1),

        easter: easter,
        "easter sunday": easter,

        "good friday": new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before Easter

        "palm sunday": new Date(easter.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before Easter

        "mothers day": this.getNthDayOfMonth(this.year, 4, 0, 2), // 2nd Sunday in May
        "mother's day": this.getNthDayOfMonth(this.year, 4, 0, 2),

        "fathers day": this.getNthDayOfMonth(this.year, 5, 0, 3), // 3rd Sunday in June
        "father's day": this.getNthDayOfMonth(this.year, 5, 0, 3),

        thanksgiving: this.getNthDayOfMonth(this.year, 10, 4, 4), // 4th Thursday in November

        "christmas eve": new Date(this.year, 11, 24),
        christmas: new Date(this.year, 11, 25),
        "christmas day": new Date(this.year, 11, 25),

        "new year eve": new Date(this.year, 11, 31),
        "new years eve": new Date(this.year, 11, 31),

        "independence day": new Date(this.year, 6, 4),
        "july 4th": new Date(this.year, 6, 4),
        "4th of july": new Date(this.year, 6, 4),

        "memorial day": this.getLastDayOfMonth(this.year, 4, 1), // Last Monday in May
        "labor day": this.getNthDayOfMonth(this.year, 8, 1, 1), // 1st Monday in September
      };

      return holidays[holidayLower] || null;
    }

    // Get the nth occurrence of a day in a month (e.g., 2nd Sunday)
    getNthDayOfMonth(year, month, dayOfWeek, occurrence) {
      const firstDay = new Date(year, month, 1);
      const firstOccurrence = new Date(
        year,
        month,
        1 + ((dayOfWeek - firstDay.getDay() + 7) % 7)
      );
      return new Date(
        year,
        month,
        firstOccurrence.getDate() + (occurrence - 1) * 7
      );
    }

    // Get the last occurrence of a day in a month
    getLastDayOfMonth(year, month, dayOfWeek) {
      const lastDay = new Date(year, month + 1, 0);
      const lastOccurrence = new Date(
        year,
        month,
        lastDay.getDate() - ((lastDay.getDay() - dayOfWeek + 7) % 7)
      );
      return lastOccurrence;
    }

    // Parse various date formats
    parseDate(dateString) {
      const cleaned = dateString.toLowerCase().trim();

      // Check if it's a holiday
      const holidayDate = this.getHolidayDate(cleaned);
      if (holidayDate) {
        return this.formatDate(holidayDate);
      }

      // Month day patterns WITH spaces (Jan 6th, January 6, etc.)
      const monthDayPattern =
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?/i;
      const monthDayMatch = cleaned.match(monthDayPattern);

      if (monthDayMatch) {
        const month = this.monthNames[monthDayMatch[1]];
        const day = parseInt(monthDayMatch[2]);
        const date = new Date(this.year, month, day);
        return this.formatDate(date);
      }

      // Month day patterns WITHOUT spaces (Nov17th, Jan6th, etc.)
      const monthDayNoSpacePattern =
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|dec|december)(\d{1,2})(st|nd|rd|th)?$/i;
      const monthDayNoSpaceMatch = cleaned.match(monthDayNoSpacePattern);

      if (monthDayNoSpaceMatch) {
        const month = this.monthNames[monthDayNoSpaceMatch[1]];
        const day = parseInt(monthDayNoSpaceMatch[2]);
        const date = new Date(this.year, month, day);
        return this.formatDate(date);
      }

      // Day month patterns (6 Jan, 6th January, etc.)
      const dayMonthPattern =
        /^(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i;
      const dayMonthMatch = cleaned.match(dayMonthPattern);

      if (dayMonthMatch) {
        const day = parseInt(dayMonthMatch[1]);
        const month = this.monthNames[dayMonthMatch[3]];
        const date = new Date(this.year, month, day);
        return this.formatDate(date);
      }

      // If no pattern matches, return the original string with year appended
      return `${dateString}, ${this.year}`;
    }

    formatDate(date) {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const day = date.getDate();
      const suffix = this.getOrdinalSuffix(day);

      return `${
        months[date.getMonth()]
      } ${day}${suffix}, ${date.getFullYear()}`;
    }

    getOrdinalSuffix(day) {
      if (day >= 11 && day <= 13) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    }

    // Convert to ISO date format for database storage
    toISODate(dateString) {
      const cleaned = dateString.toLowerCase().trim();

      // Check if it's a holiday
      const holidayDate = this.getHolidayDate(cleaned);
      if (holidayDate) {
        return holidayDate.toISOString().split("T")[0];
      }

      // Month day patterns WITH spaces
      const monthDayPattern =
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?/i;
      const monthDayMatch = cleaned.match(monthDayPattern);

      if (monthDayMatch) {
        const month = this.monthNames[monthDayMatch[1]];
        const day = parseInt(monthDayMatch[2]);
        const date = new Date(this.year, month, day);
        return date.toISOString().split("T")[0];
      }

      // Month day patterns WITHOUT spaces
      const monthDayNoSpacePattern =
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|dec|december)(\d{1,2})(st|nd|rd|th)?$/i;
      const monthDayNoSpaceMatch = cleaned.match(monthDayNoSpacePattern);

      if (monthDayNoSpaceMatch) {
        const month = this.monthNames[monthDayNoSpaceMatch[1]];
        const day = parseInt(monthDayNoSpaceMatch[2]);
        const date = new Date(this.year, month, day);
        return date.toISOString().split("T")[0];
      }

      // Day month patterns
      const dayMonthPattern =
        /^(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i;
      const dayMonthMatch = cleaned.match(dayMonthPattern);

      if (dayMonthMatch) {
        const day = parseInt(dayMonthMatch[1]);
        const month = this.monthNames[dayMonthMatch[3]];
        const date = new Date(this.year, month, day);
        return date.toISOString().split("T")[0];
      }

      // Return current date if can't parse
      return new Date().toISOString().split("T")[0];
    }
  }

  // Helper function to clean song names
  function cleanSongName(songName) {
    let cleanSong = songName.trim();

    // Convert to proper title case
    cleanSong = cleanSong
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // Add some common corrections for song titles
    cleanSong = cleanSong
      .replace(/\bOf\b/g, "of")
      .replace(/\bThe\b/g, "the")
      .replace(/\bAnd\b/g, "and")
      .replace(/\bIn\b/g, "in")
      .replace(/\bTo\b/g, "to")
      .replace(/\bA\b/g, "a")
      .replace(/\bIs\b/g, "is")
      .replace(/\bMy\b/g, "My")
      .replace(/\bOur\b/g, "Our")
      .replace(/\bLord\b/g, "Lord")
      .replace(/\bGod\b/g, "God")
      .replace(/\bJesus\b/g, "Jesus")
      .replace(/\bChrist\b/g, "Christ")
      .replace(/\bHoly\b/g, "Holy")
      .replace(/\bSpirit\b/g, "Spirit");

    // Make sure first word is always capitalized
    cleanSong = cleanSong.charAt(0).toUpperCase() + cleanSong.slice(1);

    return cleanSong;
  }

  // Helper function to determine if a line is a date
  function isDateLine(line) {
    const cleaned = line.toLowerCase().trim();

    // Holiday patterns
    const holidays = [
      "good friday",
      "easter",
      "christmas",
      "new year",
      "thanksgiving",
      "mothers day",
      "fathers day",
      "palm sunday",
      "memorial day",
      "labor day",
      "independence day",
      "july 4th",
      "4th of july",
      "mother's day",
      "father's day",
      "new years",
      "christmas eve",
      "new year eve",
    ];

    if (holidays.some((holiday) => cleaned.includes(holiday))) {
      return true;
    }

    // Date patterns - updated to handle dates without spaces and include "sept"
    const datePatterns = [
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?/i,
      /^(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i,
      // New patterns without spaces)
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november)(\d{1,2})(st|nd|rd|th)?$/i,
      /^(\d{1,2})(st|nd|rd|th)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november)$/i,
      // Standard numeric formats
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(\w+\s+\d{1,2},?\s+\d{4})/,
    ];

    return datePatterns.some((pattern) => pattern.test(cleaned));
  }

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
            // Check if this week already exists
            const existingWeekQuery = await db.collection("weeks").add({
              date: firebase.firestore.Timestamp.fromDate(new Date(date)),
              songs: songs,
            });

            if (!existingWeekQuery.empty) {
              alert("This week already exists in the database!");
              return;
            }

            await db.collection("weeks").add({
              date: firebase.firestore.Timestamp.fromDate(new Date(date)),
              songs: songs,
            });

            // Update song counts with duplicate prevention
            const batch = db.batch();
            for (const song of songs) {
              const normalizedSong = cleanSongName(song);
              if (normalizedSong.length === 0) continue;

              const songRef = db.collection("songs").doc(normalizedSong);
              const songDoc = await songRef.get();

              if (songDoc.exists) {
                batch.update(songRef, {
                  count: firebase.firestore.FieldValue.increment(1),
                });
              } else {
                batch.set(songRef, {
                  count: 1,
                  name: normalizedSong,
                });
              }
            }

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
        return;
      }

      // Only runs if all fields are valid
      try {
        // Check if this week already exists
        const existingWeekQuery = await db
          .collection("weeks")
          .where("date", "==", date)
          .get();

        if (!existingWeekQuery.empty) {
          alert("This week already exists in the database!");
          return;
        }

        await db.collection("weeks").add({
          date: firebase.firestore.Timestamp.fromDate(new Date(date)),
          songs: songs,
        });

        // Update song counts with duplicate prevention
        const batch = db.batch();
        for (const song of songs) {
          const normalizedSong = cleanSongName(song);
          if (normalizedSong.length === 0) continue;

          const songRef = db.collection("songs").doc(normalizedSong);
          const songDoc = await songRef.get();

          if (songDoc.exists) {
            batch.update(songRef, {
              count: firebase.firestore.FieldValue.increment(1),
            });
          } else {
            batch.set(songRef, {
              count: 1,
              name: normalizedSong,
            });
          }
        }

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

  function fileUpload() {
    document
      .getElementById("upload__btn")
      .addEventListener("click", function () {
        document.getElementById("file__upload").click();
      });

    // Handle file selection for multiple file types
    document
      .getElementById("file__upload")
      .addEventListener("change", handleFileUpload);
  }

  // Lazy load mammoth library only when needed
  let mammothLoaded = false;

  async function loadMammothLibrary() {
    if (mammothLoaded || typeof mammoth !== "undefined") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";
      script.onload = () => {
        mammothLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error("Failed to load Mammoth library"));
      };
      document.head.appendChild(script);
    });
  }

  async function readWordFile(file) {
    return new Promise(async (resolve, reject) => {
      try {
        // Load mammoth library if not already loaded
        await loadMammothLibrary();

        // Check if mammoth library is loaded
        if (typeof mammoth === "undefined") {
          reject(new Error("Mammoth library failed to load"));
          return;
        }

        const reader = new FileReader();

        reader.onload = async function (e) {
          try {
            const arrayBuffer = e.target.result;
            const result = await mammoth.extractRawText({
              arrayBuffer: arrayBuffer,
            });
            resolve(result.value);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = function () {
          reject(new Error("Error reading Word file"));
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      alert("Please select a file");
      return;
    }

    const fileExtension = file.name.toLowerCase().split(".").pop();
    const supportedTypes = ["xlsx", "xls", "doc", "docx"];

    if (!supportedTypes.includes(fileExtension)) {
      alert("Please select a supported file (.xlsx, .xls, .doc, .docx)");
      return;
    }

    try {
      let data;
      if (fileExtension === "xlsx" || fileExtension === "xls") {
        data = await readExcelFile(file);
        displayExcelData(data, "excel");
      } else if (fileExtension === "doc" || fileExtension === "docx") {
        // Show loading message for Word files since we need to load mammoth
        const loadingMsg = document.createElement("div");
        loadingMsg.id = "loading-message";
        loadingMsg.innerHTML = "<p>Loading Word document processor...</p>";
        document.body.appendChild(loadingMsg);

        try {
          data = await readWordFile(file);
          displayWordData(data, "word");
        } finally {
          // Remove loading message
          const loading = document.getElementById("loading-message");
          if (loading) {
            loading.remove();
          }
        }
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert(`Error reading ${fileExtension.toUpperCase()} file`);
    }
  }

  function readExcelFile(file) {
    return new Promise((resolve, reject) => {
      // Check if XLSX library is loaded
      if (typeof XLSX === "undefined") {
        reject(
          new Error(
            "XLSX library not loaded. Please add the xlsx.js script to your HTML."
          )
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = function () {
        reject(new Error("Error reading file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function displayExcelData(excelData, fileType) {
    // Create a preview container
    let previewContainer = document.getElementById("file-preview");
    if (!previewContainer) {
      previewContainer = createPreviewContainer();
    }

    // Clear previous content
    previewContainer.innerHTML = "";

    if (excelData.length === 0) {
      previewContainer.innerHTML = "<p>No data found in Excel file</p>";
      return;
    }

    // Create table to display data
    const table = document.createElement("table");
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    `;

    // Add table header
    const headerRow = document.createElement("tr");
    excelData[0].forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header || "Empty";
      th.style.cssText = `
        border: 1px solid #ddd;
        padding: 8px;
        background-color: #f2f2f2;
        text-align: left;
      `;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Add data rows (limit to first 10 rows for preview)
    const dataRows = excelData.slice(1, 11);
    dataRows.forEach((row) => {
      const tr = document.createElement("tr");
      excelData[0].forEach((_, index) => {
        const td = document.createElement("td");
        td.textContent = row[index] || "";
        td.style.cssText = `
          border: 1px solid #ddd;
          padding: 8px;
        `;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    // Add preview info
    const info = document.createElement("p");
    info.innerHTML = `
      <strong>Excel Preview:</strong> Showing first 10 rows of ${
        excelData.length - 1
      } total data rows<br>
      <strong>Columns:</strong> ${excelData[0].length}
    `;

    previewContainer.appendChild(info);
    previewContainer.appendChild(table);
    addImportButtons(previewContainer, excelData, fileType);
  }

  function displayWordData(wordText, fileType) {
    // Create a preview container
    let previewContainer = document.getElementById("file-preview");
    if (!previewContainer) {
      previewContainer = createPreviewContainer();
    }

    // Clear previous content
    previewContainer.innerHTML = "";

    if (!wordText || wordText.trim().length === 0) {
      previewContainer.innerHTML = "<p>No text found in Word document</p>";
      return;
    }

    // Parse the text to extract structured data
    const parsedData = parseWordTextToStructuredData(wordText);

    // Add preview info
    const info = document.createElement("p");
    info.innerHTML = `
      <strong>Word Document Preview:</strong><br>
      <strong>Total characters:</strong> ${wordText.length}<br>
      <strong>Parsed weeks found:</strong> ${parsedData.length}
    `;

    previewContainer.appendChild(info);

    if (parsedData.length > 0) {
      displayParsedWordData(previewContainer, parsedData);
    }

    addImportButtons(previewContainer, parsedData, fileType);
  }

  function displayParsedWordData(container, parsedData) {
    const parsedPreview = document.createElement("div");
    parsedPreview.innerHTML = "<h4>Parsed Data Preview:</h4>";

    const table = document.createElement("table");
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    `;

    // Header
    const headerRow = document.createElement("tr");
    ["Date", "Songs"].forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      th.style.cssText = `
        border: 1px solid #ddd;
        padding: 8px;
        background-color: #f2f2f2;
        text-align: left;
      `;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Show ALL data rows instead of limiting to 10
    parsedData.forEach((week) => {
      const tr = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = week.date;
      dateCell.style.cssText = `border: 1px solid #ddd; padding: 8px;`;

      const songsCell = document.createElement("td");
      songsCell.textContent = week.songs.join(", ");
      songsCell.style.cssText = `border: 1px solid #ddd; padding: 8px;`;

      tr.appendChild(dateCell);
      tr.appendChild(songsCell);
      table.appendChild(tr);
    });

    parsedPreview.appendChild(table);
    container.appendChild(parsedPreview);
  }

  // Updated parseWordTextToStructuredData with calendar functionality
  function parseWordTextToStructuredData(text) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const weeks = [];
    let currentWeek = null;
    let currentYear = new Date().getFullYear(); // Default to current year
    let dateParser = new DateParser(currentYear);

    lines.forEach((line) => {
      // Check if line is just a year (like "2024")
      const yearMatch = line.match(/^\d{4}$/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[0]);
        dateParser = new DateParser(currentYear); // Update parser with new year
        return;
      }

      // Check for date patterns (including holidays)
      const isDate = isDateLine(line);

      if (isDate) {
        // If we have a current week, save it before starting new one
        if (currentWeek && currentWeek.songs.length > 0) {
          weeks.push(currentWeek);
        }

        // Parse the date using our calendar system
        const parsedDate = dateParser.parseDate(line);
        const isoDate = dateParser.toISODate(line);

        // Start new week
        currentWeek = {
          date: parsedDate,
          isoDate: isoDate, // Store ISO date for sorting
          originalText: line,
          songs: [],
        };
      } else if (currentWeek && line.length > 1) {
        // This should be a song name
        let cleanSong = cleanSongName(line);

        if (cleanSong.length > 0) {
          currentWeek.songs.push(cleanSong);
        }
      }
    });

    // Don't forget the last week
    if (currentWeek && currentWeek.songs.length > 0) {
      weeks.push(currentWeek);
    }

    // Sort weeks by date for better organization
    weeks.sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));

    return weeks;
  }

  function createPreviewContainer() {
    const previewContainer = document.createElement("div");
    previewContainer.id = "file-preview";
    previewContainer.style.cssText = `
      height: 100vh;
      width: 100%;
      position: absolute;
      top: 0;
      left: 0;
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
      background-color: #f9f9f9;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
    `;
    document.body.appendChild(previewContainer);
    return previewContainer;
  }

  function addImportButtons(container, data, fileType) {
    const buttonContainer = document.createElement("div");
    buttonContainer.style.marginTop = "15px";

    const importBtn = document.createElement("button");
    importBtn.textContent = "Upload to song database";
    importBtn.style.cssText = `
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    `;
    importBtn.addEventListener("click", () => importToFirebase(data, fileType));

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      background-color: #f44336;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelBtn.addEventListener("click", () => {
      container.remove();
    });

    buttonContainer.appendChild(importBtn);
    buttonContainer.appendChild(cancelBtn);
    container.appendChild(buttonContainer);
  }

  async function importToFirebase(data, fileType) {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      alert("No data to import");
      return;
    }

    try {
      let importCount = 0;
      let weeks = [];

      if (fileType === "excel") {
        // Handle Excel data
        if (data.length < 2) {
          alert("No data rows found in Excel file");
          return;
        }

        const dataRows = data.slice(1); // Skip header row
        dataRows.forEach((row) => {
          if (row.length === 0 || !row[0]) return; // Skip empty rows

          const weekData = {
            date: row[0], // Assuming first column is date
            songs: [],
          };

          // Extract songs from remaining columns (skip empty ones)
          for (let i = 1; i < row.length; i++) {
            if (row[i] && row[i].toString().trim()) {
              weekData.songs.push(cleanSongName(row[i].toString().trim()));
            }
          }

          if (weekData.songs.length > 0) {
            weeks.push(weekData);
          }
        });
      } else if (fileType === "word") {
        // Handle Word data (already parsed with calendar system)
        weeks = data;
      }

      if (weeks.length === 0) {
        alert("No valid week data found to import");
        return;
      }

      // Process each week individually to handle duplicates properly
      for (const weekData of weeks) {
        try {
          // First, check if this exact week already exists
          const existingWeekQuery = await db
            .collection("weeks")
            .where("date", "==", weekData.date)
            .get();

          if (!existingWeekQuery.empty) {
            console.log(`Week ${weekData.date} already exists, skipping...`);
            continue;
          }

          // Add the week document
          await db.collection("weeks").add({
            date: weekData.date,
            songs: weekData.songs,
            isoDate: weekData.isoDate || null, // Store ISO date if available
          });

          // Update song counts using batch for efficiency
          const batch = db.batch();

          for (const song of weekData.songs) {
            // Normalize song name (trim, consistent casing)
            const normalizedSong = cleanSongName(song);

            if (normalizedSong.length === 0) continue;

            const songRef = db.collection("songs").doc(normalizedSong);
            const songDoc = await songRef.get();

            if (songDoc.exists) {
              // Song exists, increment the count
              batch.update(songRef, {
                count: firebase.firestore.FieldValue.increment(1),
              });
            } else {
              // New song, set initial count and name
              batch.set(songRef, {
                count: 1,
                name: normalizedSong,
              });
            }
          }

          await batch.commit();
          importCount++;
        } catch (error) {
          console.error("Error importing week data:", error);
        }
      }

      alert(`${importCount} weeks imported successfully`);
    } catch (error) {
      console.error("Error importing to Firebase:", error);
      alert("Error importing data to Firebase");
    } finally {
      // Remove preview container
      const previewContainer = document.getElementById("file-preview");
      if (previewContainer) {
        previewContainer.remove();
      }

      // Clear file input
      document.getElementById("file__upload").value = "";
    }
  }

  function displayFilePreview(data) {
    const overlay = document.getElementById("file__preview__overlay");
    const dateInput = document.getElementById("preview__date");
    const songList = document.getElementById("preview__song__list");

    // Set date if available
    if (data.date) {
      dateInput.value = data.date;
    }

    // Clear existing songs
    songList.innerHTML = "";

    // Populate songs
    data.songs.forEach((song) => {
      const li = document.createElement("li");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "song__input";
      input.value = song;
      input.readOnly = true;
      li.appendChild(input);
      songList.appendChild(li);
    });

    // Show overlay
    overlay.style.display = "flex";
  }

  // Add event listeners for overlay
  document
    .getElementById("close__preview")
    .addEventListener("click", closePreview);
  document
    .getElementById("close__preview__btn")
    .addEventListener("click", closePreview);
  document
    .getElementById("use__file__data")
    .addEventListener("click", useFileData);

  function closePreview() {
    document.getElementById("file__preview__overlay").style.display = "none";
  }

  function useFileData() {
    const previewDate = document.getElementById("preview__date").value;
    const previewSongs = Array.from(
      document.querySelectorAll("#preview__song__list .song__input")
    ).map((input) => input.value);

    // Populate main form
    document.querySelector(".input__date").value = previewDate;
    const mainSongInputs = document.querySelectorAll(
      ".new__format .song__input"
    );

    previewSongs.forEach((song, index) => {
      if (index < mainSongInputs.length) {
        mainSongInputs[index].value = song;
      }
    });

    closePreview();
  }

  fileUpload();
});
