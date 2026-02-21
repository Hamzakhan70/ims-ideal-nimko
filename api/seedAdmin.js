import mongoose from "mongoose";
import Admin from "./models/Admin.js";

const adminData = {
  username: "admin",
  email: "admin@idealnimko.com",
  password: "admin123",
  role: "super_admin"
};

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ideal-nimko");
    console.log("Connected to MongoDB");
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }
    
    // Create admin
    const admin = new Admin(adminData);
    await admin.save();
    
    console.log("Admin created successfully!");
    console.log("Email:", adminData.email);
    console.log("Password:", adminData.password);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
