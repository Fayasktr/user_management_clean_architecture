export type UserRole= "USER"|"ADMIN";
export type UserStatus ="ACTIVE"|"INACTIVE";

export interface User {
    id:string;
    userName:string;
    role:UserRole;
    status:UserStatus;
    passwordHash:string;
    token:string|null;
    createdAt:Date;
    updatedAt:Date;
}
