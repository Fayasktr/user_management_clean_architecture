import mongoose, {Schema,Document} from "mongoose";
import {UserRole,UserStatus} from "../../../domain/entities/User";

export interface IMongoUser {
    _id:string;
    userName:string;
    role:UserRole;
    status:UserStatus;
    syncedAt:Date;
}

const MongoUserSchema = new Schema<IMongoUser>(
  {
    _id: { type: String, required: true }, // Store the Postgres UUID as Mongo _id
    userName: { type: String, required: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    syncedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

export const MongoUserModel = mongoose.model<IMongoUser>('SyncedUser', MongoUserSchema);
