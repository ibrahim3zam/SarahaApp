import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.URL, {
            
        });
        console.log("Connected to MongoDB");

        try {
            await mongoose.connection.collection('users').dropIndex('newEmail_1');
        } catch (err) {
        }

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export default connectDB;