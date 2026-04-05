const puppeteer = require("puppeteer");

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on("console", msg => {
            if (msg.type() === "error") {
                console.log("PAGE ERROR:", msg.text());
            }
        });
        page.on("pageerror", err => {
            console.log("UNCAUGHT EXCEPTION:", err.message);
        });

        // Loop popular vite ports
        for (const port of [5173, 5174, 3000, 3001, 8080]) {
            try {
                console.log("Trying port", port);
                await page.goto(`http://localhost:${port}/shipments/new`, { waitUntil: "networkidle0", timeout: 5000 });
                console.log("Success on port", port);
                break;
            } catch (e) {
                // Ignore port connect errors
            }
        }
        
        await browser.close();
    } catch (e) {
        console.error("Puppeteer script failed:", e);
    }
})();
