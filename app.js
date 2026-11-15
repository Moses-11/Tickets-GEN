
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const form = $("ticketForm");
    const errorBox = $("formError");

    let currentTicket = null;

    const MATCH_COUNT = 3;

    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = "block";
    }

    function clearError() {
        errorBox.textContent = "";
        errorBox.style.display = "none";
    }

    function setText(id, value) {
        $(id).textContent = value;
    }

    // Generate cryptographically random digits.
    function randomDigits(length) {
        const digits = new Uint8Array(length);

        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(digits);

            return Array.from(digits)
                .map(value => value % 10)
                .join("");
        }

        return Array.from(
            { length },
            () => Math.floor(Math.random() * 10)
        ).join("");
    }

    // Generate reference code: 0000 0000
    function generateReferenceCode() {
        const digits = randomDigits(8);

        return (
            digits.substring(0, 4) +
            " " +
            digits.substring(4, 8)
        );
    }

    // Generate card ID.
    function generateCardID() {
        return "JC-" + randomDigits(6);
    }

    // Get and validate user inputs.
    function getMatchData() {
        const matches = [];
        let totalOdds = 1;

        for (let i = 1; i <= MATCH_COUNT; i++) {

            const match = $(`match${i}`).value.trim();
            const result = $(`result${i}`).value.trim();
            const oddInput = $(`odd${i}`).value.trim();

            if (!match || !result || !oddInput) {
                throw new Error(
                    `Please complete all fields for Match ${i}.`
                );
            }

            const odd = Number(oddInput);

            if (
                !Number.isFinite(odd) ||
                odd <= 1 ||
                odd > 100000
            ) {
                throw new Error(
                    `Match ${i}: enter valid decimal odds greater than 1.00.`
                );
            }

            matches.push({
                match,
                result,
                odd
            });

            totalOdds *= odd;

            if (!Number.isFinite(totalOdds)) {
                throw new Error("The combined odds are too large.");
            }
        }

        return {
            matches,
            totalOdds
        };
    }

    // Format the date and time.
    function formatDate() {
        return new Date().toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).toUpperCase();
    }

    // Populate ticket output.
    function generateTicket(data) {

        data.matches.forEach((item, index) => {

            const number = index + 1;

            setText(`outMatch${number}`, item.match);
            setText(`outResult${number}`, item.result);
            setText(`outOdd${number}`, item.odd.toFixed(2));

        });

        setText(
            "outTotal",
            data.totalOdds.toFixed(2)
        );

        const ticketId = generateCardID();
        const referenceCode = generateReferenceCode();
        const createdAt = new Date();

        setText("ticketId", ticketId);
        setText("ticketDate", formatDate());
        setText("referenceCode", referenceCode);

        currentTicket = {
            matches: data.matches,
            totalOdds: data.totalOdds,
            ticketId,
            referenceCode,
            createdAt
        };
    }

    // Generate button.
    form.addEventListener("submit", event => {

        event.preventDefault();
        clearError();

        try {

            const data = getMatchData();

            generateTicket(data);

        } catch (error) {

            showError(error.message);

        }

    });

    // Reset ticket and restore default fixtures.
    $("resetBtn").addEventListener("click", () => {

        clearError();

        currentTicket = null;

        const defaults = [
            "Team A Vs Team B",
            "Team C Vs Team D",
            "Team E Vs Team F"
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
        setText("referenceCode", "0000 0000");

    });

    // Print or save as PDF.
    $("printBtn").addEventListener("click", () => {

        if (!currentTicket) {

            showError(
                "Generate your ticket before printing or saving it."
            );

            return;
        }

        clearError();

        window.print();

    });

    // Copy ticket details.
    $("copyBtn").addEventListener("click", async () => {

        if (!currentTicket) {

            showError(
                "Generate your ticket before copying its details."
            );

            return;
        }

        clearError();

        const content = [
            "JACOB'S SOCCER PREDICTIONS",
            "",
            ...currentTicket.matches.map((item, index) =>
                `${index + 1}. ${item.match} | ${item.result} | ${item.odd.toFixed(2)}`
            ),
            "",
            `TOTAL ODDS: ${currentTicket.totalOdds.toFixed(2)}`,
            `CARD ID: ${currentTicket.ticketId}`,
            `REFERENCE CODE: ${currentTicket.referenceCode}`
        ].join("\n");

        try {

            await navigator.clipboard.writeText(content);

            const button = $("copyBtn");

            button.textContent = "COPIED ✓";

            setTimeout(() => {
                button.textContent = "COPY DETAILS";
            }, 1800);

        } catch (error) {

            showError(
                "Clipboard access unavailable. Please copy the details manually."
            );

        }

    });

})();
