import { UserRole,UserStatus } from "../../domain/entities/User";

export interface RegisterDTO{
    userName:string;
    password:string;
    role?:UserRole;
}
export interface Login {
    userName:string;
    password:string;
}

export interface StatusUpdate{
    status:UserStatus;
}