const bcrypt = require("bcrypt");

(async () => {
  const password = "1111"; // your desired password
  const hash = await bcrypt.hash(password, 10);
  console.log("Hashed password:", hash);
})();
