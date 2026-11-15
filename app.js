(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("ticketForm");
  const errorBox = $("formError");
  let currentTicket = null;

  const matchCount = 4;
  const fields = [];

  for (let i = 1; i <= matchCount; i++) {
    fields.push(`match${i}`, `result${i}`, `odd${i}`);
  }

  function randomDigits(length) {
    const digits = [];
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(length);
      window.crypto.getRandomValues(bytes);
      for (const byte of bytes) digits.push(String(byte % 10));
    } else {
      for (let i = 0; i < length; i++) {
        digits.push(String(Math.floor(Math.random() * 10)));
      }
    }
    return digits.join("");
  }

  function groupedReferenceCode() {
    const raw = randomDigits(8);
    return {
      raw,
      grouped: `${raw.slice(0, 4)} ${raw.slice(4, 8)}`
    };
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = "block";
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  function getFormData() {
    const data = {};

    for (const id of fields) {
      data[id] = $(id).value.trim();
      if (!data[id]) {
        throw new Error("Please complete all twelve fields before generating your ticket.");
      }
    }

    const matches = [];
    let total = 1;

    for (let i = 1; i <= matchCount; i++) {
      const odd = Number(data[`odd${i}`]);

      if (!Number.isFinite(odd) || odd <= 1 || odd > 100000) {
        throw new Error(`Match ${i}: enter valid decimal odds greater than 1.00 and below 100,000.`);
      }

      matches.push({
        match: data[`match${i}`],
        result: data[`result${i}`],
        odd
      });

      total *= odd;
    }

    return { matches, total };
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function generateTicket(data) {
    const reference = groupedReferenceCode();
    const now = new Date();

    data.matches.forEach((match, index) => {
      const number = index + 1;
      setText(`outMatch${number}`, match.match);
      setText(`outResult${number}`, match.result);
      setText(`outOdd${number}`, match.odd.toFixed(2));
    });

    setText("outTotal", data.total.toFixed(2));
    setText("ticketId", `JC-${randomDigits(6)}`);
    setText("ticketDate", now.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).toUpperCase());

    setText("barcodeNumber", reference.grouped);

    currentTicket = {
      matches: data.matches,
      total: data.total,
      ticketId: $("ticketId").textContent,
      referenceCode: reference.grouped,
      createdAt: now.toISOString()
    };
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    try {
      const data = getFormData();
      generateTicket(data);
    } catch (error) {
      showError(error.message);
    }
  });

  $("resetBtn").addEventListener("click", () => {
    clearError();
    currentTicket = null;

    const defaults = [
      "Team A Vs Team B",
      "Team C Vs Team D",
      "Team E Vs Team F",
      "Team G Vs Team H"
    ];

    defaults.forEach((name, index) => {
      const number = index + 1;
      setText(`outMatch${number}`, name);
      setText(`outResult${number}`, "—");
      setText(`outOdd${number}`, "—");
    });

    setText("outTotal", "—");
    setText("ticketId", "JC-000000");
    setText("ticketDate", "AWAITING DETAILS");
    setText("barcodeNumber", "0000 0000");
  });

  $("printBtn").addEventListener("click", () => {
    if (!currentTicket) {
      showError("Generate a ticket first, then print or save it as a PDF.");
      return;
    }

    clearError();
    window.print();
  });

  $("copyBtn").addEventListener("click", async () => {
    if (!currentTicket) {
      showError("Generate a ticket first, then copy its details.");
      return;
    }

    clearError();

    const ticketText = [
      "JACOB'S BETTING TICKETS",
      ...currentTicket.matches.map((match, index) =>
        `${index + 1}. ${match.match} | ${match.result} | ${match.odd.toFixed(2)}`
      ),
      `TOTAL ODDS: ${currentTicket.total.toFixed(2)}`,
      `CARD ID: ${currentTicket.ticketId}`,
      `REFERENCE CODE: ${currentTicket.referenceCode}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(ticketText);
      $("copyBtn").textContent = "COPIED ✓";
      window.setTimeout(() => {
        $("copyBtn").textContent = "COPY DETAILS";
      }, 1600);
    } catch {
      showError("Clipboard access was blocked by the browser. You can still select and copy the ticket details manually.");
    }
  });
})();
