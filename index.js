import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2";
import express from "express";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 3000;
const db = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: "school",
});

app.post("/addschool", async (req, res) => {
  //User input for school details
  const name = req.body.name;
  const address = req.body.address;
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;

  // Insert school details into the database
  db.query(
    "INSERT INTO schools (name, address, longitude, latitude) VALUES (?, ?, ?, ?)",
    [name, address, latitude, longitude],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error adding school");
      } else {
        console.log("School added successfully");
        res.send("School added successfully");
      }
    },
  );
});

app.get("/listSchools", (req, res) => {
  // 1. Get user coordinates from the query parameters
  const userLat = parseFloat(req.query.latitude);
  const userLng = parseFloat(req.query.longitude);

  // Validate that both parameters were provided
  if (!userLat || !userLng || isNaN(userLat) || isNaN(userLng)) {
    return res
      .status(400)
      .send("Please provide valid latitude and longitude query parameters.");
  }

  // 2. Fetch all schools from the database
  db.query("SELECT * FROM schools", (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error fetching schools from database");
    }

    // 3. Helper function to calculate distance in kilometers (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371; // Radius of the Earth in km

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Returns distance in kilometers
    };

    // 4. Map through results to add distance, then sort them
    const sortedSchools = results
      .map((school) => {
        return {
          ...school,
          distance_km: calculateDistance(
            userLat,
            userLng,
            school.latitude,
            school.longitude,
          ),
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);

    // 5. Return the sorted list
    res.status(200).json(sortedSchools);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
