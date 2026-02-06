import express from "express"
import dotenv from "dotenv"
import connectDB from "./database/db.js"
import cookieParser from "cookie-parser"
import cors from "cors"

import userRoute from "./routes/user.route.js"
import courseRoute from "./routes/course.route.js"
import mediaRoute from "./routes/media.route.js"
import purchaseRoute from "./routes/purchaseCourse.route.js"
import courseLearnRoute from "./routes/courseLearn.route.js"

import { stripeWebhook } from "./controllers/coursePurchase.controller.js"

dotenv.config()
connectDB()

const app = express()

// Stripe webhook (must be raw)
app.post(
  "/api/v1/purchase/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
)

// parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// CORS
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);



// routes
app.use("/api/v1/media", mediaRoute)
app.use("/api/v1/user", userRoute)
app.use("/api/v1/course", courseRoute)
app.use("/api/v1/purchase", purchaseRoute)
app.use("/api/v1", courseLearnRoute)

// listen
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
