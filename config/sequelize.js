const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  // logging: process.env.NODE_ENV === "development" ? console.log : false,
  logging:  false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been setup successfully");

  } catch (error) {
    console.log(`Could not connect to DB! ` + error);
  }
}

module.exports = { sequelize, connectDB };
