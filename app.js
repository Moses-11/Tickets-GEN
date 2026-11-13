(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("ticketForm");
  const errorBox = $("formError");
  let currentTicket = null;

  const fields = ["match1", "result1", "odd1", "match2", "result2", "odd2"];

  function randomDigits(length) {
    const digits = [];
    // Web Crypto provides stronger randomness than Math.random for the reference digits.
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(length);
      window.crypto.getRandomValues(bytes);
      for (const byte of bytes) digits.push(String(byte % 10));
    } else {
      for (let i = 0; i < length; i++) digits.push(String(Math.floor(Math.random() * 10)));
    }
    return digits.join("");
  }

  function groupedBarcodeNumber() {
    const raw = randomDigits(16);
    return { raw, grouped: raw.match(/.{4}/g).join(" ") };
  }

  function makeBarcode(rawDigits) {
    const host = $("barcode");
    host.replaceChildren();

    // A deterministic visual bar pattern derived from this ticket's 16-digit code.
    // Each digit contributes a distinct run pattern; the next generated ticket gets a new code.
    const pattern = [2, 1, 1, 2];
    for (const digit of rawDigits) {
      const n = Number(digit);
      pattern.push(1 + (n % 3), 1 + ((n + 1) % 2), 1 + ((n + 2) % 3), 1);
    }
    pattern.push(2, 1, 2, 1);

    pattern.forEach((width, index) => {
      const bar = document.createElement("span");
      bar.style.width = `${width}px`;
      bar.style.opacity = index % 3 === 0 ? "1" : ".88";
      host.appendChild(bar);
    });
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
    for (const id of fields) data[id] = $(id).value.trim();

    for (const id of fields) {
      if (!data[id]) throw new Error("Please complete all six fields before generating your ticket.");
    }

    const odd1 = Number(data.odd1);
    const odd2 = Number(data.odd2);
    if (!Number.isFinite(odd1) || !Number.isFinite(odd2) || odd1 <= 1 || odd2 <= 1) {
      throw new Error("Both odds must be valid decimal values greater than 1.00.");
    }
    if (odd1 > 100000 || odd2 > 100000) {
      throw new Error("Please enter odds below 100,000.");
    }

    return { ...data, odd1, odd2, total: odd1 * odd2 };
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function generateTicket(data) {
    const barcode = groupedBarcodeNumber();
    const now = new Date();

    setText("outMatch1", data.match1);
    setText("outResult1", data.result1);
    setText("outOdd1", data.odd1.toFixed(2));
    setText("outMatch2", data.match2);
    setText("outResult2", data.result2);
    setText("outOdd2", data.odd2.toFixed(2));
    setText("outTotal", data.total.toFixed(2));

    setText("ticketId", `WT-${randomDigits(6)}`);
    setText("ticketDate", now.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    }).toUpperCase());
    setText("barcodeNumber", barcode.grouped);
    makeBarcode(barcode.raw);

    currentTicket = {
      ...data,
      ticketId: $("ticketId").textContent,
      barcode: barcode.grouped,
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
    setText("outMatch1", "Team A Vs Team B");
    setText("outResult1", "—");
    setText("outOdd1", "—");
    setText("outMatch2", "Team C Vs Team D");
    setText("outResult2", "—");
    setText("outOdd2", "—");
    setText("outTotal", "—");
    setText("ticketId", "WT-000000");
    setText("ticketDate", "AWAITING DETAILS");
    setText("barcodeNumber", "0000 0000 0000 0000");
    $("barcode").replaceChildren();
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
    const t = currentTicket;
    const text = [
      "WILSON BETTING TICKETS",
      `${t.match1} | ${t.result1} | ${t.odd1.toFixed(2)}`,
      `${t.match2} | ${t.result2} | ${t.odd2.toFixed(2)}`,
      `TOTAL ODDS: ${t.total.toFixed(2)}`,
      `TICKET ID: ${t.ticketId}`,
      `BARCODE: ${t.barcode}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      $("copyBtn").textContent = "COPIED ✓";
      window.setTimeout(() => { $("copyBtn").textContent = "COPY DETAILS"; }, 1600);
    } catch {
      showError("Clipboard access was blocked by the browser. You can still select and copy the ticket details manually.");
    }
  });
})();
