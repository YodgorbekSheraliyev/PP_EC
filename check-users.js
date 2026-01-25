#!/usr/bin/env node

const { DataTypes, Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  ssl: process.env.NODE_ENV === 'production'
});

async function check() {
  try {
    await sequelize.authenticate();

    const result = await sequelize.query(
      "SELECT id, username, email, role FROM users",
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log('Users and their roles:');
    result.forEach(user => {
      console.log(`  ${user.username} (${user.email}): ${user.role}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

check();
