const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDb = require("./config/dbConnect");
const bodyParser = require("body-parser");
const authRoute = require("./routes/authRoute");
const chatRoute = require("./routes/chatRoute");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use("/api/auth", authRoute);
app.use("/api/chat", chatRoute);

const port = process.env.PORT || 8080;
connectDb();
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
