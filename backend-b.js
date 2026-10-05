const express = require("express");

const app = express();
const PORT = 3002;

app.get("/", (req, res) => {
    res.set("X-Backend", "B");
    res.json({
        backend: "B",
        message: "Hello from Backend B"
    });
});

app.get("/api/status", (req, res) => {
    res.set("X-Backend", "B");
    res.json({
        backend: "B",
        status: "running"
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend B running on port ${PORT}`);
});
