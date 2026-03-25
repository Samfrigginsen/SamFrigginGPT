const express = require('express');
const app = express();

app.get('/test', (req, res) => {
    res.json({ status: '[SYSTEM_OK]', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`[TEST_SERVER] Running on port ${PORT}`);
});
