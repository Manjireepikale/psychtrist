const express = require("express");
const mysql = require("mysql2");
const { check, validationResult } = require("express-validator");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Create MySQL connection pool
const pool = mysql.createPool({
	host: "localhost",
	user: "root",
	password: "root",
	database: "hospital",
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

// Middleware to parse JSON requests
app.use(bodyParser.json());

// API endpoint for new patient registration
app.post(
	"/api/patients",
	[
		check("name").notEmpty(),
		check("address").isLength({ min: 10 }),
		check("email").isEmail(),
		check("phone").isMobilePhone(),
		check("password")
			.isLength({ min: 8, max: 15 })
			.matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/),
		check("photo").notEmpty(),
	],
	async (req, res) => {
		try {
			// Validate request
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const { name, address, email, phone, password, photo } = req.body;

			// Insert patient details into the database
			const result = await pool
				.promise()
				.execute(
					"INSERT INTO patients (name, address, email, phone, password, photo) VALUES (?, ?, ?, ?, ?, ?)",
					[name, address, email, phone, password, photo]
				);

			res.status(201).json({ message: "Patient registered successfully" });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Internal Server Error" });
		}
	}
);

// API endpoint for fetching psychiatrists and patient details for a hospital
app.post(
	"/api/hospital/psychiatrists",
	[check("hospitalId").notEmpty()],
	async (req, res) => {
		try {
			// Validate request
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const hospitalId = req.body.hospitalId;

			// Fetch hospital details
			const [hospitalRows] = await pool
				.promise()
				.execute("SELECT * FROM hospitals WHERE id = ?", [hospitalId]);

			if (hospitalRows.length === 0) {
				return res.status(404).json({ error: "Hospital not found" });
			}

			const hospital = hospitalRows[0];

			// Fetch psychiatrists and patient details
			const [psychiatristsRows] = await pool
				.promise()
				.execute("SELECT id, name FROM psychiatrists WHERE hospital_id = ?", [
					hospitalId,
				]);

			const [patientsCountRows] = await pool
				.promise()
				.execute(
					"SELECT COUNT(*) as count FROM patients WHERE hospital_id = ?",
					[hospitalId]
				);

			const psychiatrists = psychiatristsRows.map((psychiatrist) => ({
				id: psychiatrist.id,
				name: psychiatrist.name,
				patientsCount: 0, // You need to implement patient count logic here
			}));

			// Prepare API response
			const response = {
				hospitalName: hospital.name,
				totalPsychiatristCount: psychiatrists.length,
				totalPatientsCount: patientsCountRows[0].count,
				psychiatristDetails: psychiatrists,
			};

			res.status(200).json(response);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Internal Server Error" });
		}
	}
);

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
