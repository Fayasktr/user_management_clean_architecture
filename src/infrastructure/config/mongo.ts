import mongoose from "mongoose";

export const connectMongo= async():Promise<void>=>{
    try{
        await mongoose.connect(process.env.MONGO_URI||'mongodb://localhost:27017/user_management_logs')
        console.log("mongodb connected ")
    }catch(e){
        console.log("can't connect MongoDB, Error:",e);
    }
}

export const disconnectMongo= async():Promise<void>=>{
    try{
        await mongoose.disconnect();
        console.log("mongodb disconnected");
    }catch(e){
        console.log("error:",e);
    }
}