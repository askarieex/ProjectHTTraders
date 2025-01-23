// config/config.js

module.exports = {
    development: {
      username: "postgres",          // Directly set username
      password: "AskerY786.@",       // Directly set password
      database: "httraders",         // Directly set database name
      host: "localhost",             // Directly set host
      dialect: "postgres"
    },
    // Optionally add configurations for test and production
    test: {
      username: "postgres",
      password: "AskerY786.@", 
      database: "httraders",
      host: "localhost",
      dialect: "postgres"
    },
    production: {
      username: "postgres",
      password: "AskerY786.@", 
      database: "httraders_prod",
      host: "localhost",
      dialect: "postgres"
    }
  };
  